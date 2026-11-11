import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { describeCommand, prompts, sections } from "./commands";
import { runAndClose } from "./defi";
import { useDesktop } from "./desktop";
import { describeError, RecoveryActions } from "./error-view";
import { formatShortcut } from "./shortcut";
import { forWorkspace, suggestions, type Suggestion } from "./suggest";

const entries = sections.flatMap(([section, list]) => list.map((entry) => ({ ...entry, section })));
const recentLimit = 5;

// A workspace suggestion is kept as its workspace and action, and worded again from the live state,
// so a reordered or moved workspace never shows a stale label or display.
type Recent = { command: string } | { suggestion: Suggestion } | { workspaceID: string; action: string };

const recentKey = (run: Recent) =>
  "command" in run
    ? run.command
    : "suggestion" in run
      ? run.suggestion.args.join(" ")
      : `${run.action} ${run.workspaceID}`;

const suggestionIcons: Record<Suggestion["kind"], Icon> = {
  width: Icon.ArrowsExpand,
  height: Icon.ChevronUpDown,
  workspace: Icon.ArrowRight,
  column: Icon.AppWindowSidebarLeft,
  window: Icon.Window,
};

// What a row does, then the line to paste into [keys]; Default Shortcut appears where Defi binds
// one, or as None for a command that has none.
function CommandDetail({ text, command, shortcut }: { text: string; command?: string; shortcut?: string | null }) {
  // Without a default shortcut, the key in the line is a stand-in, and says so.
  const key = shortcut ? `"${shortcut}"` : '"mod-x"';
  const note = shortcut ? "" : "  # pick your own key";
  const binding = command ? `\n\n\`\`\`toml\n${key} = "${command}"${note}\n\`\`\`` : "";
  return (
    <List.Item.Detail
      markdown={text + binding}
      metadata={
        shortcut !== undefined ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Default Shortcut"
              text={shortcut ? formatShortcut(shortcut) : "None"}
            />
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.RunCommand }>) {
  // An empty optional argument arrives as "", so fall through to the root-search text.
  const [searchText, setSearchText] = useState(props.arguments?.query || props.fallbackText || "");
  const [recent, setRecent] = useCachedState<Recent[]>("recent-runs", []);
  const [showDetail, setShowDetail] = useCachedState("show-command-detail", true);
  const desktop = useDesktop();
  const problem = desktop.error;
  const suggested = suggestions(searchText, problem ? [] : (desktop.workspaces ?? []));
  const live = desktop.workspaces ?? [];
  const recentRows = searchText
    ? []
    : recent.flatMap((run): (Suggestion | string)[] => {
        if ("command" in run) return [run.command];
        if ("suggestion" in run) return [run.suggestion];
        // A remembered move to a workspace that has since gone is dropped rather than offered.
        const workspace = live.find((candidate) => candidate.id === run.workspaceID);
        const suggestion = workspace && forWorkspace(workspace, live).find((s) => s.args[0] === run.action);
        return suggestion ? [suggestion] : [];
      });

  const remember = (run: Recent) => {
    setRecent([run, ...recent.filter((other) => recentKey(other) !== recentKey(run))].slice(0, recentLimit));
  };

  const run = (entry: (typeof entries)[number]) => {
    remember({ command: entry.command });
    return runAndClose([entry.command.split(" ")], entry.hud);
  };

  // Runs a suggestion, naming the window it moves from a fresh read.
  const runSuggestion = async (suggestion: Suggestion) => {
    const workspaceID =
      suggestion.kind === "width" || suggestion.kind === "height" ? undefined : suggestion.args.at(-1);
    remember(workspaceID ? { workspaceID, action: suggestion.args[0] } : { suggestion });
    const app = suggestion.hud?.includes("{window}")
      ? (await desktop.fresh().catch(() => undefined))?.windows.find((window) => window.focused)?.appName
      : undefined;
    await runAndClose([suggestion.args], suggestion.hud?.replace("{window}", app ?? "window"));
  };

  const suggestionItem = (suggestion: Suggestion, keyPrefix = "") => (
    <List.Item
      key={keyPrefix + suggestion.args.join(" ")}
      icon={suggestionIcons[suggestion.kind]}
      title={suggestion.title}
      // Built-in filtering would drop "+10" from "Widen Column by 10%"; the query always matches.
      keywords={keyPrefix ? suggestion.title.split(" ") : [searchText]}
      detail={
        <CommandDetail text={suggestion.description} command={suggestion.binding} shortcut={suggestion.shortcut} />
      }
      actions={
        <ActionPanel>
          <Action title="Run Command" icon={Icon.Play} onAction={() => runSuggestion(suggestion)} />
          {/* Copy keeps ⌘↵ on every row; without a [keys] form, it copies the CLI call. */}
          <Action.CopyToClipboard
            title="Copy Command"
            content={suggestion.binding ?? `defi ${suggestion.args.join(" ")}`}
          />
          {toggleDetail}
        </ActionPanel>
      }
    />
  );

  const toggleDetail = (
    <ActionPanel.Section>
      <Action
        title={showDetail ? "Hide Details" : "Show Details"}
        icon={Icon.AppWindowSidebarRight}
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        onAction={() => setShowDetail(!showDetail)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={desktop.revalidate}
      />
    </ActionPanel.Section>
  );

  const item = (entry: (typeof entries)[number], keyPrefix = "") => (
    <List.Item
      key={keyPrefix + entry.command}
      icon={Icon[entry.icon]}
      title={entry.title}
      subtitle={showDetail ? undefined : entry.command}
      keywords={entry.command.split(/[- ]/)}
      // The side pane shows the shortcut, so rows next to it stay bare.
      accessories={
        !showDetail && entry.shortcut ? [{ text: formatShortcut(entry.shortcut), tooltip: "Default shortcut" }] : []
      }
      detail={
        <CommandDetail
          text={describeCommand(entry.command)}
          command={entry.command}
          shortcut={entry.shortcut ?? null}
        />
      }
      actions={
        <ActionPanel>
          <Action title="Run Command" icon={Icon.Play} onAction={() => run(entry)} />
          <Action.CopyToClipboard title="Copy Command" content={entry.command} />
          {toggleDetail}
        </ActionPanel>
      }
    />
  );

  return (
    <List
      filtering={{ keepSectionOrder: true }}
      // The catalog is static; only suggestions wait for Defi's state.
      isLoading={desktop.isLoading && (!desktop.workspaces || suggested.length > 0)}
      isShowingDetail={showDetail}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search commands, or type 60, +10, 2…"
    >
      {problem ? (
        <List.Section>
          <List.Item
            icon={describeError(problem).icon}
            title={describeError(problem).title}
            keywords={[searchText]}
            detail={<CommandDetail text={describeError(problem).description} />}
            actions={<RecoveryActions error={problem} onRetry={desktop.revalidate} />}
          />
        </List.Section>
      ) : null}
      {suggested.length > 0 ? (
        <List.Section title="Suggestions">{suggested.map((suggestion) => suggestionItem(suggestion))}</List.Section>
      ) : null}
      {recentRows.length > 0 ? (
        <List.Section title="Recent">
          {recentRows.map((run) => {
            if (typeof run !== "string") return suggestionItem(run, "recent-");
            const entry = entries.find((candidate) => candidate.command === run);
            return entry ? item(entry, "recent-") : null;
          })}
        </List.Section>
      ) : null}
      {sections.map(([section]) => (
        <List.Section key={section} title={section}>
          {/* Example rows stay findable by search, and step aside once the search is itself an argument. */}
          {suggested.length > 0
            ? null
            : prompts
                .filter((prompt) => prompt.section === section)
                .map((prompt) => (
                  <List.Item
                    key={prompt.title}
                    icon={Icon[prompt.icon]}
                    title={prompt.title}
                    subtitle={showDetail ? undefined : prompt.examples}
                    keywords={prompt.keywords}
                    detail={<CommandDetail text={prompt.hint} />}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Insert Example"
                          icon={Icon.TextCursor}
                          onAction={() => setSearchText(prompt.example)}
                        />
                        <Action.CopyToClipboard title="Copy Command" content={prompt.syntax} />
                        {toggleDetail}
                      </ActionPanel>
                    }
                  />
                ))}
          {entries.filter((entry) => entry.section === section).map((entry) => item(entry))}
        </List.Section>
      ))}
    </List>
  );
}
