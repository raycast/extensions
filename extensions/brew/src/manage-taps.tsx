/**
 * Manage Taps: every third-party tap as a section, holding its packages as the
 * same rows Search renders. Add, trust, untrust and remove taps from any row.
 *
 * Adding a tap is a trust decision, and Homebrew 7 owns it (`brew trust`). The
 * command puts a deliberate confirmation in front of it rather than inventing a
 * consent model of its own. Typing or pasting a tap into the search bar — or
 * passing one as the command's argument — offers to add it.
 *
 * Action order follows the tree, nearest object first: the package's own
 * actions, then its tap's section, then View.
 */

import { useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { getProgressIcon, useCachedState } from "@raycast/utils";
import {
  brewIdentifier,
  brewName,
  brewTapCommand,
  confirmAndRun,
  formatCount,
  HOMEBREW_7,
  InstalledMap,
  parseTapName,
  tapCommandName,
  type Cask,
  type Formula,
  type Tap,
  type TapStatus,
  type TapTarget,
} from "./utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CaskListItem, FormulaListItem } from "./components/list";
import { RefreshAction, ToggleSidebarAction } from "./components/actionPanels";
import { STATUS_COLOR, WARNING_ICON } from "./components/palette";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { useBrewMajorVersion } from "./hooks/useBrewMajorVersion";
import { isInstalled } from "./hooks/useBrewSearch";
import { useBrewTaps } from "./hooks/useBrewTaps";

const ALL_TAPS = "all";

/** "3 formulae, 2 casks" — what a tap provides, leaving out a kind it has none of. */
function provides(tap: Tap): string {
  const parts = [
    tap.formula_names.length > 0 ? formatCount(tap.formula_names.length, "formula", "formulae") : undefined,
    tap.cask_tokens.length > 0 ? formatCount(tap.cask_tokens.length, "cask") : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Commands only";
}

function commandNames(tap: Tap): string[] {
  return (tap.command_files ?? []).map(tapCommandName);
}

/** The web page for a tap's remote, when it is one. `updatest/tap` is a `.git` URL. */
function repositoryUrl(tap: Tap): string | undefined {
  return tap.remote?.startsWith("https://") ? tap.remote.replace(/\.git$/, "") : undefined;
}

/** Where a tap is cloned from, as a person would read it. */
function tapSource(target: TapTarget): string {
  const [user, repo] = target.tap.split("/");
  return (target.url ?? `github.com/${user}/homebrew-${repo}`).replace(/^https:\/\//, "");
}

/**
 * What the tap provides, its trust, and how many of its packages brew could not
 * load — so a section showing fewer rows than it claims says why.
 */
function sectionSubtitle(tap: TapStatus, trustSupported: boolean, unavailable: string[]): string {
  const broken = unavailable.filter((name) => name.startsWith(`${tap.name}/`)).length;
  return [
    provides(tap),
    trustSupported && tap.trusted !== undefined ? (tap.trusted ? "Trusted" : "Not Trusted") : undefined,
    broken > 0 ? `${broken} Won't Load` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The row mark, for exceptions only: a package trusted on its own in a tap that
 * is not. Every other row's trust is its tap's, which the section subtitle says
 * once rather than on every row.
 */
function trustException(tap: TapStatus, item: Cask | Formula): List.Item.Accessory | undefined {
  if (tap.trusted !== false || !tap.trustedPackages.includes(brewIdentifier(item))) return undefined;
  return {
    icon: { source: Icon.CheckRosette, tintColor: STATUS_COLOR.info },
    tooltip: "Trusted on its own. The tap is not, so packages added to it later will ask first.",
  };
}

/** The sidebar's Trust row. */
function trustRow(tap: TapStatus, item: Cask | Formula, trustSupported: boolean) {
  if (!trustSupported || tap.trusted === undefined) return undefined;
  if (tap.trusted)
    return { text: "Trusted with its tap", icon: { source: Icon.CheckRosette, tintColor: STATUS_COLOR.ok } };
  if (tap.trustedPackages.includes(brewIdentifier(item)))
    return { text: "Trusted on its own", icon: { source: Icon.CheckRosette, tintColor: STATUS_COLOR.info } };
  return { text: "Not trusted", icon: WARNING_ICON };
}

/** Everything installed from this tap, as the qualified names brew prints. */
function installedFrom(tap: Tap, installed: InstalledMap | undefined): string[] | undefined {
  if (!installed) return undefined;
  return [...installed.formulae.values(), ...installed.casks.values()]
    .filter((item) => item.tap === tap.name)
    .map(brewIdentifier);
}

async function addTap(target: TapTarget, trustSupported: boolean, onDone: () => void) {
  const user = target.tap.split("/")[0];
  const commands = [brewTapCommand("tap", target.tap, ...(target.url ? [target.url] : []))];
  if (trustSupported) commands.push(brewTapCommand("trust", "--tap", target.tap));
  const ok = await confirmAndRun(commands, {
    title: `Add ${target.tap}?`,
    showCommands: false,
    confirmTitle: "Add Tap",
    message: trustSupported
      ? `Maintained by ${user}, not Homebrew. Adding also trusts it, which lets Homebrew run anything it provides, now or later.`
      : `Maintained by ${user}, not Homebrew. Adding it lets Homebrew install anything it provides.`,
    stepNoun: "step",
    labels: {
      progress: `Adding ${target.tap}`,
      success: `Added ${target.tap}`,
      failure: `Failed to add ${target.tap}`,
    },
  });
  if (ok) onDone();
}

async function trustTap(tap: Tap, onDone: () => void) {
  const ok = await confirmAndRun([brewTapCommand("trust", "--tap", tap.name)], {
    title: `Trust ${tap.name}?`,
    showCommands: false,
    confirmTitle: "Trust",
    message: `Maintained by ${tap.user}, not Homebrew. Trusting it lets Homebrew run anything it provides (${provides(tap).toLowerCase()}), now or later.`,
    labels: {
      progress: `Trusting ${tap.name}`,
      success: `Trusted ${tap.name}`,
      failure: `Failed to trust ${tap.name}`,
    },
  });
  if (ok) onDone();
}

async function untrustTap(tap: Tap, onDone: () => void) {
  const ok = await confirmAndRun([brewTapCommand("untrust", "--tap", tap.name)], {
    title: `Stop Trusting ${tap.name}?`,
    showCommands: false,
    confirmTitle: "Stop Trusting",
    message: "Homebrew will not load packages from this tap unless they are trusted individually.",
    labels: {
      progress: `Untrusting ${tap.name}`,
      success: `Stopped trusting ${tap.name}`,
      failure: `Failed to stop trusting ${tap.name}`,
    },
  });
  if (ok) onDone();
}

async function untap(tap: Tap, installed: string[] | undefined, onDone: () => void) {
  // Unknown (the installed list has not loaded) runs a plain untap: brew itself
  // refuses while packages from the tap are installed, so nothing is lost.
  const uninstalls = installed ?? [];
  const force = uninstalls.length > 0;
  const ok = await confirmAndRun([brewTapCommand("untap", ...(force ? ["--force"] : []), tap.name)], {
    title: force
      ? `Uninstall ${formatCount(uninstalls.length, "Package")} and Remove ${tap.name}?`
      : `Remove ${tap.name}?`,
    message: force
      ? `Homebrew will not remove a tap while packages from it are installed, so these are uninstalled first:\n${uninstalls.join("\n")}`
      : "Removes the local copy of this tap. Its packages will no longer appear in Homebrew.",
    showCommands: false,
    confirmTitle: force ? "Uninstall and Remove" : "Remove",
    labels: {
      progress: `Removing ${tap.name}`,
      success: `Removed ${tap.name}`,
      failure: `Failed to remove ${tap.name}`,
    },
  });
  if (ok) onDone();
}

/**
 * The tap's own actions, appended to every row in its section. No shortcuts:
 * a package panel already binds Open (⌘O) and Remove (⌃X) to the package.
 * `copyName` is off for a cask row, whose panel already has Copy Tap Name.
 */
function TapSection(props: {
  tap: TapStatus;
  installed: InstalledMap | undefined;
  trustSupported: boolean;
  copyName: boolean;
  onChange: () => void;
}) {
  const { tap, onChange } = props;
  const url = repositoryUrl(tap);
  const canTrust = props.trustSupported && !tap.official && tap.trusted !== undefined;
  return (
    <ActionPanel.Section title={tap.name}>
      {canTrust && !tap.trusted && (
        <Action title="Trust Tap" icon={Icon.CheckRosette} onAction={() => trustTap(tap, onChange)} />
      )}
      {canTrust && tap.trusted && (
        <Action title="Stop Trusting Tap" icon={Icon.XMarkCircle} onAction={() => untrustTap(tap, onChange)} />
      )}
      {url && <Action.OpenInBrowser title="Open Repository" url={url} />}
      {props.copyName && <Action.CopyToClipboard title="Copy Tap Name" content={tap.name} />}
      {!tap.official && (
        <Action
          title="Remove Tap"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => untap(tap, installedFrom(tap, props.installed), onChange)}
        />
      )}
    </ActionPanel.Section>
  );
}

/**
 * A tap with no formulae or casks only adds brew commands, so it gets one row
 * naming them. Its primary action opens the repository: a stray ↵ must never
 * change trust.
 */
function CommandsItem(props: {
  tap: TapStatus;
  installed: InstalledMap | undefined;
  trustSupported: boolean;
  showMetadataPanel: boolean;
  onToggleSidebar: () => void;
  onChange: () => void;
}) {
  const { tap } = props;
  const commands = commandNames(tap);
  const url = repositoryUrl(tap);
  const trusted =
    props.trustSupported && tap.trusted !== undefined ? (tap.trusted ? "Trusted" : "Not trusted") : undefined;
  return (
    <List.Item
      id={`commands:${tap.name}`}
      title="No formulae or casks"
      subtitle={props.showMetadataPanel ? undefined : commands.length > 0 ? `Adds ${commands.join(", ")}` : undefined}
      icon={Icon.Terminal}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={tap.name} text="Adds brew commands and no formulae or casks" />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Commands">
                {commands.map((command) => (
                  <List.Item.Detail.Metadata.TagList.Item key={command} text={command} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {trusted && <List.Item.Detail.Metadata.Label title="Trust" text={trusted} />}
              {tap.remote && (
                <List.Item.Detail.Metadata.Label title="Source" text={tap.remote.replace(/^https:\/\//, "")} />
              )}
              {tap.last_commit && <List.Item.Detail.Metadata.Label title="Last Commit" text={tap.last_commit} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {url && (
            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open Repository" url={url} />
            </ActionPanel.Section>
          )}
          {commands.length > 0 && (
            <ActionPanel.Section title="Commands">
              {commands.map((command) => (
                <Action.CopyToClipboard key={command} title={`Copy "${command}"`} content={command} />
              ))}
            </ActionPanel.Section>
          )}
          <TapSection
            tap={tap}
            installed={props.installed}
            trustSupported={props.trustSupported}
            copyName
            onChange={props.onChange}
          />
          <ActionPanel.Section title="View">
            <ToggleSidebarAction onToggleSidebar={props.onToggleSidebar} />
            <RefreshAction onRefresh={props.onChange} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function matches(item: Cask | Formula, query: string): boolean {
  return [brewName(item), brewIdentifier(item), item.desc ?? ""].join(" ").toLowerCase().includes(query);
}

function ManageTapsContent(props: { initialTap?: string }) {
  const [searchText, setSearchText] = useState(props.initialTap ?? "");
  const [tapFilter, setTapFilter] = useState(ALL_TAPS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showDescription, setShowDescription] = useCachedState("show-description", true);
  const { isLoading, data, revalidate } = useBrewTaps();
  const { data: installed, revalidate: revalidateInstalled } = useBrewInstalled();
  const { major } = useBrewMajorVersion();
  const trustSupported = major !== undefined && major >= HOMEBREW_7;

  const onChange = () => {
    revalidate();
    revalidateInstalled();
  };
  const onToggleSidebar = () => setShowMetadataPanel((current) => !current);

  const taps = data?.taps ?? [];
  const target = parseTapName(searchText);
  const known = target && taps.find((tap) => tap.name === target.tap);
  const offerAdd = target !== undefined && !known && data !== undefined;
  const query = target ? "" : searchText.trim().toLowerCase();

  // A typed tap narrows to that tap (or offers to add it); anything else
  // searches package names and descriptions, and a tap-name hit keeps the
  // whole section.
  const sections = offerAdd
    ? []
    : taps
        .filter((tap) => (known ? tap === known : tapFilter === ALL_TAPS || tap.name === tapFilter))
        .map((tap) => {
          const tapHit = query === "" || tap.name.includes(query);
          const keep = <T extends Cask | Formula>(items: T[]) =>
            items.filter((item) => item.tap === tap.name && (tapHit || matches(item, query)));
          return {
            tap,
            formulae: keep(data?.packages.formulae ?? []),
            casks: keep(data?.packages.casks ?? []),
            commandsOnly: tap.formula_names.length === 0 && tap.cask_tokens.length === 0,
            tapHit,
          };
        })
        .filter((s) => s.formulae.length > 0 || s.casks.length > 0 || (s.commandsOnly && s.tapHit));

  const rowProps = {
    selectedId,
    isInstalled: (name: string) => isInstalled(name, installed),
    onAction: onChange,
    showMetadataPanel,
    onToggleSidebar,
    showDescription,
    onToggleDescription: () => setShowDescription((current) => !current),
  };
  const tapSectionProps = { installed, trustSupported, onChange };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      filtering={false}
      isShowingDetail={showMetadataPanel}
      searchBarPlaceholder="Search packages and taps, or type user/repo to add…"
      searchBarAccessory={
        <List.Dropdown tooltip="Tap" value={tapFilter} onChange={setTapFilter}>
          <List.Dropdown.Item title="All Taps" value={ALL_TAPS} />
          <List.Dropdown.Section title="Taps">
            {taps.map((tap) => (
              <List.Dropdown.Item key={tap.name} title={tap.name} value={tap.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {isLoading && !data ? (
        <List.EmptyView icon={getProgressIcon(0.5)} title="Loading taps…" description="Running brew tap-info" />
      ) : taps.length === 0 && !offerAdd ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="No Third-Party Taps"
          description="To add one, type it as user/repo or paste its install command."
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Packages or Taps"
          description="To add a tap, type it as user/repo or paste its install command."
        />
      )}

      {offerAdd && target && (
        <List.Section title="Add">
          <List.Item
            id="add"
            title={`Add ${target.tap}`}
            subtitle={tapSource(target)}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Add Tap"
                  icon={Icon.Plus}
                  onAction={() =>
                    addTap(target, trustSupported, () => {
                      setSearchText(target.tap);
                      onChange();
                    })
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {sections.map(({ tap, formulae, casks, commandsOnly }) => (
        <List.Section
          key={tap.name}
          title={tap.name}
          subtitle={sectionSubtitle(tap, trustSupported, data?.packages.unavailable ?? [])}
        >
          {formulae.map((formula) => (
            <FormulaListItem
              key={`formula:${brewIdentifier(formula)}`}
              id={`formula:${brewIdentifier(formula)}`}
              formula={formula}
              {...rowProps}
              extraAccessory={trustException(tap, formula)}
              trust={trustRow(tap, formula, trustSupported)}
              extraActions={<TapSection tap={tap} copyName {...tapSectionProps} />}
            />
          ))}
          {casks.map((cask) => (
            <CaskListItem
              key={`cask:${brewIdentifier(cask)}`}
              id={`cask:${brewIdentifier(cask)}`}
              cask={cask}
              {...rowProps}
              extraAccessory={trustException(tap, cask)}
              trust={trustRow(tap, cask, trustSupported)}
              extraActions={<TapSection tap={tap} copyName={false} {...tapSectionProps} />}
            />
          ))}
          {commandsOnly && (
            <CommandsItem
              tap={tap}
              showMetadataPanel={showMetadataPanel}
              onToggleSidebar={onToggleSidebar}
              {...tapSectionProps}
            />
          )}
        </List.Section>
      ))}
    </List>
  );
}

export default function Main(props: LaunchProps<{ arguments: Arguments.ManageTaps }>) {
  return (
    <ErrorBoundary>
      <ManageTapsContent initialTap={props.arguments.tap?.trim() || undefined} />
    </ErrorBoundary>
  );
}
