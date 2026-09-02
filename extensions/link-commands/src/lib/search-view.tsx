import {
  Action,
  ActionPanel,
  Color,
  type Application,
  Icon,
  List,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  Keyboard,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { useState } from "react";
import { categoryLabel, categoryName, environmentLabel, environmentName, facetsOf, packageLabel } from "./convention";
import { ALL_FILTER, filterOptions, sectionsFor } from "./grouping";
import { isLinkCommand, linkTargetOf } from "./link-command";
import { duplicateScript, makeExecutable } from "./script-operations";
import { discoverScriptCommands } from "./discover-script-commands";
import { resolveIcon } from "./resolve-icon";
import { languageForScript } from "./script-language";
import type { DiscoveryResult, ScriptArgument, ScriptCommand } from "./types";

/**
 * Declared here rather than using the generated `Preferences` global: this view is shared by two
 * extensions whose manifests differ, and `raycast-env.d.ts` is generated per extension. The subset
 * below is what both declare.
 */
type SearchPreferences = {
  scriptDirectories: string;
  showBodyPreview: boolean;
  groupCommands: boolean;
  terminalApplication?: Application;
};

const BODY_PREVIEW_LINES = 300;

const RAYCAST_DIRECTORY_SETTINGS = "Raycast Settings → Extensions → Script Commands → Add Directories";

/**
 * A dropdown's choices are the whole of what it tells you — a placeholder like "Surface" names the
 * axis but not what you can pick along it. Text and password arguments have no choices, so they fall
 * back to the placeholder they prompt with.
 */
const argumentTags = (argument: ScriptArgument, index: number) =>
  argument.data?.length
    ? argument.data.map((choice) => choice.title)
    : [argument.placeholder ?? argument.type ?? `argument${index + 1}`];

const sourceBlock = (command: ScriptCommand) => {
  const lines = command.body.split("\n");
  const shown = lines.slice(0, BODY_PREVIEW_LINES).join("\n");
  const notice =
    lines.length > BODY_PREVIEW_LINES ? `\n\n_Showing the first ${BODY_PREVIEW_LINES} of ${lines.length} lines._` : "";

  return `\`\`\`${languageForScript(command.path)}\n${shown}\n\`\`\`${notice}`;
};

/**
 * A link command's whole body is one `open` call and its header repeats the metadata tabulated
 * beside it, so there is nothing left for the markdown pane to say — the target belongs in the table
 * with the other facts. Returning undefined renders metadata alone, which is the dense, honest view
 * for a link. Anything that is not a link keeps its source, because there the body is the point.
 */
const buildMarkdown = (command: ScriptCommand, showBodyPreview: boolean) => {
  const isLink = linkTargetOf(command) !== undefined;
  if (isLink && !showBodyPreview) return undefined;

  return sourceBlock(command);
};

/** A target carrying an unsubstituted `$1` or `${query}` cannot be opened, so it must not be a link. */
const isOpenableUrl = (target: string) => /^https?:\/\//i.test(target) && !/\$/.test(target);

const ScriptMetadata = ({ command }: { command: ScriptCommand }) => {
  const facets = facetsOf(command);
  const link = linkTargetOf(command);

  return (
    <List.Item.Detail.Metadata>
      {/* Each facet keeps its own row, because a package and a category are different things and one
          shared heading would name neither. The value is a pill rather than plain text so the
          classification reads as chips against the scalar rows below, and it is spelled out rather
          than sigilled — the row title already says which axis it is, so `#ref` would be shorthand
          for something already stated. Colour only reinforces what the label says. */}
      {facets.environment ? (
        <List.Item.Detail.Metadata.TagList title="Environment">
          <List.Item.Detail.Metadata.TagList.Item text={environmentName(facets.environment)} color={Color.Orange} />
        </List.Item.Detail.Metadata.TagList>
      ) : null}
      {facets.brand ? (
        <List.Item.Detail.Metadata.TagList title="Package">
          <List.Item.Detail.Metadata.TagList.Item text={packageLabel(facets.brand)} />
        </List.Item.Detail.Metadata.TagList>
      ) : null}
      {facets.category ? (
        <List.Item.Detail.Metadata.TagList title="Category">
          <List.Item.Detail.Metadata.TagList.Item text={categoryName(facets.category)} color={Color.Blue} />
        </List.Item.Detail.Metadata.TagList>
      ) : null}

      {link ? (
        <>
          {/* A target containing a placeholder is not a resolvable URL, so it is shown as text
              rather than as a link that would fail on click. */}
          {isOpenableUrl(link.target) ? (
            <List.Item.Detail.Metadata.Link title="Target" target={link.target} text={link.target} />
          ) : (
            <List.Item.Detail.Metadata.Label title="Target" text={link.target} />
          )}
          {link.application ? <List.Item.Detail.Metadata.Label title="Opens With" text={link.application} /> : null}
        </>
      ) : null}

      {command.argumentsList.length > 0 ? (
        <List.Item.Detail.Metadata.TagList title="Prompts For">
          {command.argumentsList.flatMap((argument, index) =>
            argumentTags(argument, index).map((text) => (
              <List.Item.Detail.Metadata.TagList.Item key={`${index}-${text}`} text={text} />
            )),
          )}
        </List.Item.Detail.Metadata.TagList>
      ) : null}

      <List.Item.Detail.Metadata.Separator />

      {command.description ? <List.Item.Detail.Metadata.Label title="Description" text={command.description} /> : null}
      {command.needsConfirmation ? <List.Item.Detail.Metadata.Label title="Confirms First" text="Yes" /> : null}
      {command.refreshTime ? <List.Item.Detail.Metadata.Label title="Refresh Time" text={command.refreshTime} /> : null}
      {command.currentDirectoryPath ? (
        <List.Item.Detail.Metadata.Label title="Working Directory" text={command.currentDirectoryPath} />
      ) : null}
      {/* Only worth a row when it is a problem — Raycast silently refuses to run a non-executable. */}
      {command.isExecutable ? null : (
        <List.Item.Detail.Metadata.Label title="Executable" text="No — Raycast cannot run it" icon={Icon.Warning} />
      )}
      <List.Item.Detail.Metadata.Label title="File" text={basename(command.path)} />
    </List.Item.Detail.Metadata>
  );
};

const runScriptCommand = async (command: ScriptCommand) => {
  await closeMainWindow();
  await open(command.deeplink);
};

const applyMakeExecutable = async (command: ScriptCommand, onRefresh: () => void) => {
  try {
    await makeExecutable(command.path);
    await showToast({ style: Toast.Style.Success, title: "Made executable", message: command.filename });
    onRefresh();
  } catch (error) {
    await showFailureToast(error, { title: "Could not change permissions" });
  }
};

const applyDuplicate = async (command: ScriptCommand, onRefresh: () => void) => {
  try {
    const target = await duplicateScript(command.path);
    await showToast({ style: Toast.Style.Success, title: "Duplicated", message: basename(target) });
    onRefresh();
  } catch (error) {
    await showFailureToast(error, { title: "Could not duplicate the script" });
  }
};

type ScriptActionsProps = {
  command: ScriptCommand;
  terminalApplication?: Application;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
};

const ScriptActions = ({
  command,
  terminalApplication,
  isShowingDetail,
  onToggleDetail,
  onRefresh,
}: ScriptActionsProps) => (
  <ActionPanel>
    <ActionPanel.Section>
      {command.isExecutable ? null : (
        <Action
          title="Make Executable"
          icon={Icon.Checkmark}
          onAction={() => applyMakeExecutable(command, onRefresh)}
        />
      )}
      <Action title="Run Script Command" icon={Icon.Play} onAction={() => runScriptCommand(command)} />
      {terminalApplication ? (
        <Action.Open
          title={`Run in ${terminalApplication.name}`}
          icon={Icon.Terminal}
          target={command.path}
          application={terminalApplication}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
      ) : null}
      <Action.Open title="Open in Default Editor" icon={Icon.Pencil} target={command.path} />
      <Action.OpenWith title="Open with…" path={command.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      <Action.ShowInFinder path={command.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
      <Action
        title="Duplicate Script"
        icon={Icon.CopyClipboard}
        onAction={() => applyDuplicate(command, onRefresh)}
        shortcut={Keyboard.Shortcut.Common.Duplicate}
      />
    </ActionPanel.Section>

    <ActionPanel.Section title="Containing Folder">
      <Action.Open
        title="Open Folder"
        icon={Icon.Folder}
        target={command.directory}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
      <Action.OpenWith title="Open Folder with…" path={command.directory} />
      <Action.CopyToClipboard title="Copy Folder Path" content={command.directory} />
    </ActionPanel.Section>

    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy Path" content={command.path} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.CopyToClipboard
        title="Copy Deeplink"
        content={command.deeplink}
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      />
    </ActionPanel.Section>

    <ActionPanel.Section>
      <Action
        title={isShowingDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        onAction={onToggleDetail}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>

    <ActionPanel.Section>
      <Action.Trash
        title="Move Script to Trash"
        paths={command.path}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onTrash={onRefresh}
      />
    </ActionPanel.Section>
  </ActionPanel>
);

const EmptyState = ({
  hasDirectories,
  skipped,
  onRefresh,
}: {
  hasDirectories: boolean;
  skipped: number;
  onRefresh: () => void;
}) => (
  <List.EmptyView
    icon={Icon.Terminal}
    title={hasDirectories ? "No Link Commands Found" : "No Script Directories Set"}
    description={
      hasDirectories
        ? skipped > 0
          ? `${skipped} Script Command${skipped === 1 ? "" : "s"} found, but none of them are links. A link command opens a URL, a folder or an app — anything that does more is left to Raycast's own Script Commands list.`
          : "None of the configured folders contain a file with a @raycast.schemaVersion header. Check the paths, or add a script."
        : `Add the folders holding your scripts in this extension's preferences. Raycast keeps its own directory list in an encrypted database that no extension can read, so the paths you added under ${RAYCAST_DIRECTORY_SETTINGS} have to be entered here as well.`
    }
    actions={
      <ActionPanel>
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      </ActionPanel>
    }
  />
);

export type SearchViewProps = {
  /** Link Commands lists only what it can identify as a link; the general explorer lists everything. */
  linksOnly: boolean;
};

export const SearchView = ({ linksOnly }: SearchViewProps) => {
  const preferences = getPreferenceValues<SearchPreferences>();
  const [selectedFilter, setSelectedFilter] = useState<string>(ALL_FILTER);
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const { data, isLoading, revalidate } = usePromise(discoverScriptCommands, [preferences.scriptDirectories], {
    onData: (result: DiscoveryResult) => {
      if (result.errors.length === 0) return;

      const detail = result.errors.map((error) => `${error.directory} (${error.message})`).join(", ");
      showFailureToast(new Error(detail), { title: "Some directories could not be read" });
    },
  });

  const discovered = data?.commands ?? [];

  // The narrowing that earns the name: a Script Command whose body does something other than open a
  // target is a script, not a link, and belongs to Raycast's own Script Commands list rather than
  // here. Filtering at the source keeps the facet counts honest — a package is only offered as a
  // filter when a link actually carries it.
  const commands = linksOnly ? discovered.filter(isLinkCommand) : discovered;
  const skipped = discovered.length - commands.length;

  const { environments, brands, categories } = filterOptions(commands);
  const sections = sectionsFor(commands, selectedFilter, preferences.groupCommands);
  const visibleCount = sections.reduce((total, section) => total + section.entries.length, 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && visibleCount > 0}
      searchBarPlaceholder="Search link commands…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by environment, category or package"
          value={selectedFilter}
          onChange={setSelectedFilter}
        >
          <List.Dropdown.Item title="All" value={ALL_FILTER} />
          {environments.length > 0 ? (
            <List.Dropdown.Section title="Environment">
              {environments.map((option) => (
                <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
              ))}
            </List.Dropdown.Section>
          ) : null}
          {categories.length > 0 ? (
            <List.Dropdown.Section title="Category">
              {categories.map((option) => (
                <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
              ))}
            </List.Dropdown.Section>
          ) : null}
          {brands.length > 0 ? (
            <List.Dropdown.Section title="Package">
              {brands.map((option) => (
                <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      <EmptyState
        hasDirectories={preferences.scriptDirectories.trim().length > 0}
        skipped={skipped}
        onRefresh={revalidate}
      />

      {sections.map((section) => (
        <List.Section key={section.key} title={section.title}>
          {section.entries.map(({ command, facets }) => (
            <List.Item
              key={command.path}
              icon={resolveIcon(command)}
              title={facets.name}
              subtitle={facets.brand ? packageLabel(facets.brand) : undefined}
              keywords={[
                command.title,
                command.filename,
                command.packageName ?? "",
                facets.environment ? environmentLabel(facets.environment) : "",
                facets.category ? categoryLabel(facets.category) : "",
              ].filter(Boolean)}
              accessories={command.isExecutable ? undefined : [{ icon: Icon.Warning, tooltip: "Not executable" }]}
              detail={
                <List.Item.Detail
                  markdown={buildMarkdown(command, preferences.showBodyPreview)}
                  metadata={<ScriptMetadata command={command} />}
                />
              }
              actions={
                <ScriptActions
                  command={command}
                  terminalApplication={preferences.terminalApplication}
                  isShowingDetail={isShowingDetail}
                  onToggleDetail={() => setIsShowingDetail((value) => !value)}
                  onRefresh={revalidate}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
