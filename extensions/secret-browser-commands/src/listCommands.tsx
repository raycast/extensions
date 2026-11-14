import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, useLocalStorage } from "@raycast/utils";
import { countOf } from "@chrismessina/raycast-kit";
import { OpenInBrowserSubmenu } from "./components/OpenInActions";
import { browserCommands } from "./data/paths";
import { SUPPORTED_BROWSERS, BROWSER_CHROME } from "./types/browsers";
import { browserAppPath, browserIcon, findInstalledBrowsers, isBrowserAvailable } from "./utils/browserApps";
import { buildBrowserUrl } from "./utils/browserUrl";
import { openUrlInBrowser } from "./utils/openUrlInBrowser";
import { BrowserCommand, Platform } from "./types/types";

const DEFAULT_BROWSER_KEY = BROWSER_CHROME.key;

// Default starred command IDs
const DEFAULT_STARRED_COMMANDS = ["extensions", "bookmarks", "downloads", "whats-new", "flags"];

const PLATFORM_NAMES: Record<Platform, string> = {
  windows: "Windows",
  mac: "macOS",
  linux: "Linux",
};

// darwin = macOS, win32 = Windows, everything else = Linux
function getCurrentPlatform(): Platform {
  if (process.platform === "darwin") return "mac";
  if (process.platform === "win32") return "windows";
  return "linux";
}

function commandKind(command: BrowserCommand) {
  if (command.isDeprecated) {
    return { label: "Removed", icon: { source: Icon.Trash, tintColor: Color.SecondaryText } };
  }
  if (command.isDebugCommand) {
    return { label: "Crash Command", icon: { source: Icon.Bug, tintColor: Color.Red } };
  }
  if (command.isInternalDebugging) {
    return { label: "Internal Debugging", icon: { source: Icon.Bug, tintColor: Color.Orange } };
  }
  if (command.isUntrusted) {
    return { label: "Untrusted Context", icon: { source: Icon.Warning, tintColor: Color.Red } };
  }
  return { label: "Standard", icon: { source: Icon.Globe, tintColor: Color.Blue } };
}

export default function Command() {
  // Preferences is the ambient type generated into raycast-env.d.ts
  const prefs = getPreferenceValues<Preferences>();
  const hideDebugUrls = prefs.hideDebugUrls ?? true;
  const hideUntrustedUrls = prefs.hideUntrustedUrls ?? true;
  const hideDeprecatedUrls = prefs.hideDeprecatedUrls ?? true;

  const {
    data: installedBrowsers,
    isLoading: isCheckingBrowsers,
    revalidate: recheckBrowsers,
  } = useCachedPromise(findInstalledBrowsers, [], { keepPreviousData: true });

  const [searchText, setSearchText] = useState("");
  // useCachedState, not useLocalStorage: this is view state, and its synchronous read means the
  // pane does not flash open on launch before a stored `false` arrives.
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail", true);
  // A view filter rather than a preference: the other three hide things that are dangerous or
  // gone, which you set once. This one is about how noisy today's list is, so it belongs in reach.
  const [showUnopenable, setShowUnopenable] = useCachedState<boolean>("show-unopenable", true);
  const {
    value: storedBrowser = DEFAULT_BROWSER_KEY,
    setValue: setSelectedBrowser,
    isLoading,
  } = useLocalStorage<string>("selected-browser", DEFAULT_BROWSER_KEY);
  // A key persisted by an older version may no longer exist — "atlas" was retired in 1.2.0.
  // Left as-is it matches no command and the list renders empty, so fall back to the default.
  const selectedBrowser = SUPPORTED_BROWSERS.some((b) => b.key === storedBrowser) ? storedBrowser : DEFAULT_BROWSER_KEY;
  const {
    value: starredCommands = DEFAULT_STARRED_COMMANDS,
    setValue: setStarredCommands,
    isLoading: isStarredLoading,
  } = useLocalStorage<string[]>("starred-commands", DEFAULT_STARRED_COMMANDS);

  const currentBrowser = SUPPORTED_BROWSERS.find((b) => b.key === selectedBrowser) ?? BROWSER_CHROME;

  // Anything persisted under this key was written by us as string[], but a corrupt or
  // hand-edited value would otherwise take the whole list down on `.includes`.
  const hydratedStars = useMemo(
    () => (Array.isArray(starredCommands) ? starredCommands.filter((id) => typeof id === "string") : []),
    [starredCommands],
  );

  // Our own writes live in React state, not a ref synced on every render. A ref reassigned during
  // render is overwritten by the hook's not-yet-updated array before the next toggle reads it, which
  // silently dropped the earlier of two quick stars. State survives re-renders, so each toggle
  // derives from the previous one.
  const [pendingStars, setPendingStars] = useState<string[] | undefined>(undefined);
  const starred = pendingStars ?? hydratedStars;
  const starredSet = useMemo(() => new Set(starred), [starred]);

  const toggleStar = (commandId: string) => {
    // Before the first read lands the hook hands back DEFAULT_STARRED_COMMANDS, so writing now would
    // overwrite whatever was actually saved. Once we hold our own value we keep accepting toggles —
    // isStarredLoading also goes true on the re-read after every write, and blocking on that made
    // Star silently do nothing.
    if (isStarredLoading && pendingStars === undefined) return;
    const next = starred.includes(commandId) ? starred.filter((id) => id !== commandId) : [...starred, commandId];
    setPendingStars(next);
    setStarredCommands(next);
  };

  const describe = (command: BrowserCommand) =>
    typeof command.description === "function" ? command.description(currentBrowser) : command.description;

  const getFullUrl = (itemPath: string): string => buildBrowserUrl(currentBrowser.scheme, itemPath);

  const userPlatform = getCurrentPlatform();
  // `openUrlInBrowser` shells out to macOS `open`. On Windows there is nothing to call, so rather
  // than offer actions that always fail, the extension drops to reference mode: browse and copy.
  const canLaunchBrowsers = userPlatform === "mac";
  // Optimistic until discovery answers — see browserIcon for why undefined is not "absent".
  const currentBrowserInstalled = isBrowserAvailable(installedBrowsers, currentBrowser.key);
  // Nothing here varies per row, so it is resolved once rather than per rendered command.
  // Non-undefined only when we have both a browser we can name and permission to launch it.
  const launchApp =
    canLaunchBrowsers && currentBrowser.appName && currentBrowserInstalled
      ? (browserAppPath(installedBrowsers, currentBrowser.key) ?? currentBrowser.appName)
      : undefined;
  const query = searchText.toLowerCase();

  // Does the command match what the user asked for — search, browser, platform?
  const isRelevant = (command: BrowserCommand) => {
    const description = describe(command) || "";
    const matchesSearch =
      command.name.toLowerCase().includes(query) ||
      command.path.toLowerCase().includes(query) ||
      getFullUrl(command.path).toLowerCase().includes(query) ||
      description.toLowerCase().includes(query);

    const isBrowserCompatible = command.supportedBrowsers.includes(selectedBrowser);
    const isPlatformCompatible =
      (!command.platforms || command.platforms.includes(userPlatform)) &&
      (!command.excludedPlatforms || !command.excludedPlatforms.includes(userPlatform));

    return matchesSearch && isBrowserCompatible && isPlatformCompatible;
  };

  // …and if it matches, what is withholding it? ALL applicable reasons, not just the first.
  // Four commands are both untrusted and unusable; reporting one reason under-counted the fix, so
  // switching off the named preference revealed nothing and the message then blamed a second filter.
  // A flag-gated URL is exempt from the unusable filter: it names the flag that makes it work.
  const hiddenReasons = (command: BrowserCommand): string[] => {
    const reasons: string[] = [];
    if (hideDebugUrls && command.isDebugCommand) reasons.push("crash commands");
    if (hideUntrustedUrls && command.isUntrusted) reasons.push("untrusted commands");
    if (hideDeprecatedUrls && command.isDeprecated) reasons.push("removed commands");
    if (!showUnopenable && command.notDirectlyReachable && !command.requiresFeatureFlag) {
      reasons.push("unusable commands");
    }
    return reasons;
  };

  // One pass: decide relevance, then why (if at all) each relevant command is withheld.
  const relevantCommands = browserCommands
    .filter(isRelevant)
    .map((command) => ({ command, reasons: hiddenReasons(command) }));

  const filteredCommands = relevantCommands
    .filter(({ reasons }) => reasons.length === 0)
    .map(({ command }) => command)
    // Starred first; sort is stable, so everything else keeps the file's own ordering.
    .sort((a, b) => Number(starredSet.has(b.id)) - Number(starredSet.has(a.id)));

  // Only commands that WOULD have matched and are being withheld. A preference being switched on
  // is not by itself a reason to mention it — for a search nothing matches, nothing is hidden.
  const withheld = relevantCommands.filter(({ reasons }) => reasons.length > 0);
  const withheldReasons = [...new Set(withheld.flatMap(({ reasons }) => reasons))];

  return (
    <List
      isLoading={isLoading || isStarredLoading}
      isShowingDetail={showDetail && filteredCommands.length > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search commands…"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Browser" value={selectedBrowser} onChange={(value) => setSelectedBrowser(value)}>
          {SUPPORTED_BROWSERS.map((browser) => (
            <List.Dropdown.Item
              key={browser.key}
              title={browser.title}
              value={browser.key}
              icon={browserIcon(browser, installedBrowsers)}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Matching Commands"
        description={[
          searchText
            ? `No ${currentBrowser.title} command matches “${searchText}”.`
            : `No ${currentBrowser.title} commands are visible.`,
          // Only surfaced when something matching is genuinely being withheld — naming a filter
          // that is hiding nothing sends people to a setting that cannot help.
          withheld.length > 0
            ? `${countOf(withheld.length, "match")} hidden: ${withheldReasons.join(", ")}.`
            : searchText
              ? "Try another browser in the dropdown, or clear the search."
              : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {filteredCommands.map((command) => {
        const isStarred = starredSet.has(command.id);
        const description = describe(command) || "No description available.";
        const fullUrl = getFullUrl(command.path);
        const kind = commandKind(command);

        const accessories: List.Item.Accessory[] = [];
        if (command.isDeprecated) accessories.push({ tag: { value: "Removed", color: Color.SecondaryText } });
        if (command.requiresFeatureFlag) accessories.push({ tag: { value: "Flag", color: Color.Yellow } });
        else if (command.notDirectlyReachable)
          accessories.push(
            showDetail
              ? {
                  icon: { source: Icon.Warning, tintColor: Color.Orange },
                  tooltip: "Don't use — this URL won't load in a tab",
                }
              : { tag: { value: "Don't Use", color: Color.Orange } },
          );
        if (isStarred) accessories.push({ icon: { source: Icon.Star, tintColor: Color.Magenta }, tooltip: "Starred" });

        const markdown = [
          `# ${command.name}`,
          "",
          description,
          command.isDeprecated && command.deprecationNote ? `\n> **Removed.** ${command.deprecationNote}` : "",
          command.requiresFeatureFlag
            ? `\n> **Behind a flag.** Launch with \`--enable-features=${command.requiresFeatureFlag}\`, or the page will not load.`
            : command.notDirectlyReachable
              ? "\n> **Don't use this one.** Chrome lists the URL, but navigating to it returns a network error. Most are panels drawn inside the browser's own interface rather than standalone pages."
              : "",
          command.isDebugCommand
            ? "\n> **This deliberately crashes, hangs, or quits the browser.** Depending on the command that may take down one tab, the GPU process, or the whole browser with everything unsaved in it."
            : "",
          command.isInternalDebugging
            ? "\n> **Needs internal debugging pages.** Open `chrome://chrome-urls` in the browser and choose *Enable internal debugging pages* first, or this shows a placeholder."
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        return (
          <List.Item
            key={`${command.id}-${selectedBrowser}`}
            title={command.name}
            subtitle={command.path}
            icon={kind.icon}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="URL" text={fullUrl} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Type" text={kind.label} icon={kind.icon} />
                    <List.Item.Detail.Metadata.Separator />
                    {command.isDeprecated ? (
                      <List.Item.Detail.Metadata.Label
                        title="Supported Browsers"
                        text="None — removed from every browser we checked"
                        icon={{ source: Icon.Trash, tintColor: Color.SecondaryText }}
                      />
                    ) : (
                      <List.Item.Detail.Metadata.TagList title="Supported Browsers">
                        {command.supportedBrowsers.map((key) => {
                          const browser = SUPPORTED_BROWSERS.find((b) => b.key === key);
                          return (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={key}
                              text={browser?.title ?? key}
                              icon={browser ? browserIcon(browser, installedBrowsers) : undefined}
                            />
                          );
                        })}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {(command.platforms || command.excludedPlatforms) && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Platform Compatibility"
                          text={
                            command.platforms
                              ? command.platforms.map((p) => PLATFORM_NAMES[p]).join(", ")
                              : `All except ${command.excludedPlatforms?.map((p) => PLATFORM_NAMES[p]).join(", ")}`
                          }
                        />
                      </>
                    )}
                    {!canLaunchBrowsers ? (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Opening"
                          text={`Launching a browser is macOS only — copy the URL and paste it into ${currentBrowser.title}.`}
                          icon={{ source: Icon.Clipboard, tintColor: Color.SecondaryText }}
                        />
                      </>
                    ) : (
                      !currentBrowserInstalled && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Opening"
                            text={
                              isCheckingBrowsers
                                ? `Checking whether ${currentBrowser.title} is installed…`
                                : `${currentBrowser.title} is not installed — copy the URL instead.`
                            }
                            icon={{ source: Icon.Clipboard, tintColor: Color.SecondaryText }}
                          />
                        </>
                      )
                    )}
                    {command.notDirectlyReachable && !command.requiresFeatureFlag && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Usable"
                          text="No — Chrome lists it, but navigating to it returns a network error"
                          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
                        />
                      </>
                    )}
                    {command.requiresFeatureFlag && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Required Feature Flag"
                          text={command.requiresFeatureFlag}
                          icon={{ source: Icon.Flag, tintColor: Color.Yellow }}
                        />
                      </>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Starred"
                      text={isStarred ? "Yes" : "No"}
                      icon={isStarred ? { source: Icon.Star, tintColor: Color.Magenta } : undefined}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title={command.name}>
                {launchApp !== undefined && (
                  <Action
                    title={`Open in ${currentBrowser.title}`}
                    icon={browserIcon(currentBrowser, installedBrowsers)}
                    style={command.isDebugCommand ? Action.Style.Destructive : undefined}
                    onAction={() => openUrlInBrowser({ app: launchApp, name: currentBrowser.title }, fullUrl, command)}
                  />
                )}
                {/* Sits directly below Open so it inherits the primary slot whenever Open is absent
                    — on Windows, and for a browser you do not have installed. */}
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={fullUrl}
                  shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
                />
                <Action
                  title={isStarred ? "Unstar" : "Star"}
                  icon={{ source: isStarred ? Icon.StarDisabled : Icon.Star, tintColor: Color.Magenta }}
                  onAction={() => toggleStar(command.id)}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
                {canLaunchBrowsers && (
                  <OpenInBrowserSubmenu
                    commandPath={command.path}
                    currentBrowser={selectedBrowser}
                    supportedBrowsers={command.supportedBrowsers}
                    command={command}
                    installedBrowsers={installedBrowsers}
                  />
                )}
                {canLaunchBrowsers && (
                  <Action
                    title="Recheck Installed Browsers"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => recheckBrowsers()}
                  />
                )}
                <Action
                  title={showUnopenable ? "Hide Unusable Commands" : "Show Unusable Commands"}
                  icon={showUnopenable ? Icon.EyeDisabled : Icon.Eye}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "h" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "h" },
                  }}
                  onAction={() => setShowUnopenable((v) => !v)}
                />
                <Action
                  title="Toggle Sidebar"
                  icon={Icon.AppWindowSidebarRight}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "d" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                  }}
                  onAction={() => setShowDetail((v) => !v)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
