import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { basename, dirname } from "node:path";
import { useCallback, useState } from "react";
import { DirectoryPickerForm } from "./components/DirectoryPickerForm";
import { useContentSearch } from "./hooks/useContentSearch";
import { useSearchDirectory } from "./hooks/useSearchDirectory";
import { openInEditor } from "./services/editor-launcher";
import { ENGINE_LABELS, type EngineFailure } from "./services/search-engine-resolver";
import type { SearchDirectorySource } from "./types/finder";
import type { CaseMode, SearchMode } from "./types/preferences";
import type { SearchError, SearchErrorKind, SearchOptions, SearchResult } from "./types/search";
import { EDITOR_TITLES } from "./utils/editor-open";
import { getValidatedPreferences } from "./utils/preferences";
import { resultDetailMarkdown } from "./utils/result-detail";
import { searchOptionsFromPreferences } from "./utils/search-options";

const SOURCE_LABELS: Record<SearchDirectorySource, string> = {
  "finder-selection": "Finder selection",
  "finder-file-parent": "Parent of selected file",
  "finder-window": "Finder window",
  "default-directory": "Default directory",
  "user-picked": "Picked directory",
  home: "Home directory",
};

const ERROR_TITLES: Record<SearchErrorKind, string> = {
  "finder-unavailable": "Finder Not Available",
  "finder-permission-denied": "Finder Access Denied",
  "directory-inaccessible": "Directory Not Accessible",
  "picker-cancelled": "Directory Selection Cancelled",
  "engine-unavailable": "No Search Engine Available",
  "engine-startup-failed": "Search Engine Failed to Start",
  "engine-crashed": "Search Engine Failed",
  "invalid-query": "Invalid Query",
  "invalid-glob": "Invalid Filter Pattern",
  unexpected: "Something Went Wrong",
};

function errorIcon(kind: SearchErrorKind): Icon {
  if (kind === "finder-permission-denied" || kind === "directory-inaccessible") return Icon.Lock;
  if (kind === "invalid-query" || kind === "invalid-glob") return Icon.ExclamationMark;
  return Icon.Warning;
}

function errorDescription(error: SearchError, failures: EngineFailure[]): string {
  if (failures.length === 0) return error.message;
  const tried = failures.map((failure) => ENGINE_LABELS[failure.engine]).join(", ");
  return `${error.message}\nEngines tried first: ${tried}`;
}

interface EmptyViewProps {
  icon: Icon;
  title: string;
  description?: string;
}

/** Smart case matches case-sensitively as soon as the query has an uppercase letter. */
function isCaseSensitive(options: SearchOptions, query: string): boolean {
  return options.caseMode === "sensitive" || (options.caseMode === "smart" && /\p{Lu}/u.test(query));
}

/** Options that are actively narrowing the search and may explain an empty result. */
function narrowingFilters(options: SearchOptions, query: string): string[] {
  const filters: string[] = [];
  if (isCaseSensitive(options, query)) filters.push("case sensitive");
  if (!options.includeHidden) filters.push("hidden files excluded");
  if (options.respectIgnoreFiles) filters.push(".gitignore respected");
  if (options.includedExtensions.length > 0) filters.push(`only ${options.includedExtensions.join(", ")} files`);
  if (options.maxDepth !== null) filters.push(`depth ≤ ${options.maxDepth}`);
  if (options.excludeGlobs.length > 0) filters.push(`${options.excludeGlobs.length} session exclusions`);
  if (options.wholeWord) filters.push("whole word only");
  return filters;
}

function emptyViewProps(
  directory: { path: string; source: SearchDirectorySource } | null,
  finderError: SearchError | null,
  search: { status: string; query: string; error: SearchError | null; failures: EngineFailure[] },
  options: SearchOptions,
): EmptyViewProps {
  if (directory === null) {
    if (finderError !== null) {
      return {
        icon: errorIcon(finderError.kind),
        title: ERROR_TITLES[finderError.kind] ?? "Select a Search Directory",
        description: `${finderError.message}\nPick a directory to search instead.`,
      };
    }
    return {
      icon: Icon.Folder,
      title: "Select a Search Directory",
      description: "No Finder directory was detected. Choose a directory to get started.",
    };
  }

  // Keep the Finder failure visible while a fallback directory is in use.
  const notice =
    finderError !== null
      ? `${ERROR_TITLES[finderError.kind]} — searching ${SOURCE_LABELS[directory.source]} instead`
      : null;
  const location =
    notice === null ? `${directory.path} · ${SOURCE_LABELS[directory.source]}` : `${notice}\n${directory.path}`;
  if (search.status === "error" && search.error !== null) {
    return {
      icon: errorIcon(search.error.kind),
      title: ERROR_TITLES[search.error.kind],
      description: errorDescription(search.error, search.failures),
    };
  }
  if (search.query.trim().length === 0) {
    return { icon: Icon.MagnifyingGlass, title: "Type to Search File Contents", description: location };
  }
  if (search.status === "cancelled") {
    return { icon: Icon.XMarkCircle, title: "Search Cancelled", description: location };
  }
  if (search.status === "done") {
    const filters = narrowingFilters(options, search.query);
    return {
      icon: Icon.MagnifyingGlass,
      title: "No Results",
      description: [
        notice,
        `No matches for “${search.query.trim()}” in ${basename(directory.path) || directory.path}`,
        filters.length > 0 ? `Active filters: ${filters.join(" · ")} — press ⌘K to broaden the search` : null,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    };
  }
  return { icon: Icon.MagnifyingGlass, title: "Searching…", description: location };
}

export default function Command() {
  const [preferences] = useState(getValidatedPreferences);
  const [options, setOptions] = useState(() => searchOptionsFromPreferences(preferences));
  const [showDetail, setShowDetail] = useState(preferences.showMatchPreview);
  const { directory, finderError, isLoading, redetect, setDirectory, useHomeDirectory } =
    useSearchDirectory(preferences);
  const search = useContentSearch(directory?.path ?? null, options, preferences);

  const updateOptions = useCallback((patch: Partial<SearchOptions>) => {
    setOptions((previous) => {
      const keys = Object.keys(patch) as (keyof SearchOptions)[];
      // Unchanged values keep the same object identity so the running search is not restarted.
      if (keys.every((key) => previous[key] === patch[key])) return previous;
      return { ...previous, ...patch };
    });
  }, []);

  const excludeFromSearch = useCallback((glob: string, label: string) => {
    setOptions((previous) =>
      previous.excludeGlobs.includes(glob) ? previous : { ...previous, excludeGlobs: [...previous.excludeGlobs, glob] },
    );
    void showToast({ style: Toast.Style.Success, title: `Excluded ${label} for this session` });
  }, []);

  const clearExclusions = useCallback(() => {
    setOptions((previous) => (previous.excludeGlobs.length === 0 ? previous : { ...previous, excludeGlobs: [] }));
  }, []);

  const openResultInEditor = useCallback(
    async (result: SearchResult) => {
      try {
        await openInEditor(preferences.preferredEditor, {
          filePath: result.filePath,
          line: result.line,
          column: result.column,
        });
      } catch (error) {
        await showFailureToast(error, { title: "Could Not Open Editor" });
      }
    },
    [preferences.preferredEditor],
  );

  const parentPath = directory === null ? null : dirname(directory.path);

  const optionsSection = (
    <ActionPanel.Section title="Search Options">
      <Action
        title={options.wholeWord ? "Disable Whole Word" : "Enable Whole Word"}
        icon={Icon.Text}
        onAction={() => updateOptions({ wholeWord: !options.wholeWord })}
      />
      <Action
        title={options.includeHidden ? "Exclude Hidden Files" : "Include Hidden Files"}
        icon={options.includeHidden ? Icon.EyeDisabled : Icon.Eye}
        onAction={() => updateOptions({ includeHidden: !options.includeHidden })}
      />
      <Action
        title={options.respectIgnoreFiles ? "Search Ignored Files" : "Respect Ignore Files"}
        icon={Icon.Filter}
        onAction={() => updateOptions({ respectIgnoreFiles: !options.respectIgnoreFiles })}
      />
      <Action
        title={showDetail ? "Hide Match Preview" : "Show Match Preview"}
        icon={Icon.Document}
        onAction={() => setShowDetail((value) => !value)}
      />
      {options.excludeGlobs.length > 0 ? (
        <Action
          title={`Clear Session Exclusions (${options.excludeGlobs.length})`}
          icon={Icon.XMarkCircle}
          onAction={clearExclusions}
        />
      ) : null}
    </ActionPanel.Section>
  );

  const directorySection = (
    <ActionPanel.Section title="Search Directory">
      <Action.Push
        title="Change Search Directory"
        icon={Icon.Folder}
        target={<DirectoryPickerForm onPick={(path) => void setDirectory(path, "user-picked")} />}
      />
      {parentPath !== null && directory !== null && parentPath !== directory.path ? (
        <Action
          title="Search Parent Folder"
          icon={Icon.ArrowUp}
          shortcut={Keyboard.Shortcut.Common.MoveUp}
          onAction={() => void setDirectory(parentPath, "user-picked")}
        />
      ) : null}
      <Action title="Detect Finder Directory" icon={Icon.Finder} onAction={() => void redetect()} />
      <Action title="Use Home Directory" icon={Icon.House} onAction={() => void useHomeDirectory()} />
      <Action
        title="Refresh Search"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={search.refresh}
      />
    </ActionPanel.Section>
  );

  const sharedSections = (
    <>
      {optionsSection}
      {directorySection}
    </>
  );

  const noResults =
    directory !== null && search.status === "done" && search.query.trim().length > 0 && search.results.length === 0;

  // On an empty result the first section offers only the loosening moves, so
  // Enter applies the most likely fix directly from the empty view.
  const broadenSection = (
    <ActionPanel.Section title="Broaden Search">
      {isCaseSensitive(options, search.query) ? (
        <Action title="Ignore Case" icon={Icon.Lowercase} onAction={() => updateOptions({ caseMode: "insensitive" })} />
      ) : null}
      {!options.includeHidden ? (
        <Action title="Include Hidden Files" icon={Icon.Eye} onAction={() => updateOptions({ includeHidden: true })} />
      ) : null}
      {options.respectIgnoreFiles ? (
        <Action
          title="Search Ignored Files"
          icon={Icon.Filter}
          onAction={() => updateOptions({ respectIgnoreFiles: false })}
        />
      ) : null}
      {options.includedExtensions.length > 0 ? (
        <Action
          title="Search All File Types"
          icon={Icon.Document}
          onAction={() => updateOptions({ includedExtensions: [] })}
        />
      ) : null}
      {options.maxDepth !== null ? (
        <Action title="Remove Depth Limit" icon={Icon.ArrowDown} onAction={() => updateOptions({ maxDepth: null })} />
      ) : null}
      {options.excludeGlobs.length > 0 ? (
        <Action
          title={`Clear Session Exclusions (${options.excludeGlobs.length})`}
          icon={Icon.XMarkCircle}
          onAction={clearExclusions}
        />
      ) : null}
      {options.wholeWord ? (
        <Action title="Disable Whole Word" icon={Icon.Text} onAction={() => updateOptions({ wholeWord: false })} />
      ) : null}
    </ActionPanel.Section>
  );

  const actions = noResults ? (
    <ActionPanel>
      {broadenSection}
      {directorySection}
    </ActionPanel>
  ) : (
    <ActionPanel>{sharedSections}</ActionPanel>
  );

  const resultActions = (result: SearchResult) => {
    const relativeDir = dirname(result.relativePath);
    const contextContent = [...(result.contextBefore ?? []), result.lineText, ...(result.contextAfter ?? [])].join(
      "\n",
    );
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Open title="Open File" target={result.filePath} />
          <Action
            title={`Open in ${EDITOR_TITLES[preferences.preferredEditor]}`}
            icon={Icon.Code}
            onAction={() => void openResultInEditor(result)}
          />
          <Action.ShowInFinder path={result.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard
            title="Copy Path"
            content={result.filePath}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Relative Path" content={result.relativePath} />
          <Action.CopyToClipboard title="Copy Line" content={result.lineText} />
          <Action.CopyToClipboard title="Copy Line with Context" content={contextContent} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Exclude from Search">
          <Action
            title={`Exclude File ${result.fileName}`}
            icon={Icon.EyeDisabled}
            onAction={() => excludeFromSearch(result.relativePath, result.relativePath)}
          />
          {relativeDir !== "." ? (
            <Action
              title={`Exclude Folder ${relativeDir}`}
              icon={Icon.EyeDisabled}
              onAction={() => excludeFromSearch(`${relativeDir}/**`, `${relativeDir}/`)}
            />
          ) : null}
        </ActionPanel.Section>
        {sharedSections}
      </ActionPanel>
    );
  };

  const empty = emptyViewProps(directory, finderError, search, options);
  const engineLabel = search.engine ? ENGINE_LABELS[search.engine] : "Resolving engine…";
  const countLabel = search.limitReached
    ? `first ${search.results.length} matches · limit reached`
    : `${search.results.length} matches`;
  // Keep it short: the folder name is already in the search bar placeholder and
  // the detail metadata, and a long subtitle wraps when the detail pane is open.
  const fallbackLabel =
    search.failures.length > 0
      ? search.failures.length === 1
        ? `fallback from ${ENGINE_LABELS[search.failures[0].engine]}`
        : `fallback from ${search.failures.length} engines`
      : null;
  const sectionSubtitle = directory ? (fallbackLabel ?? SOURCE_LABELS[directory.source]) : undefined;

  return (
    <List
      filtering={false}
      isLoading={isLoading || search.status === "searching"}
      isShowingDetail={showDetail && search.results.length > 0}
      onSearchTextChange={search.setQuery}
      searchBarPlaceholder={
        directory ? `Search in ${basename(directory.path) || directory.path}…` : "Search text in files…"
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Mode and Case Sensitivity"
          value={`${options.searchMode}:${options.caseMode}`}
          onChange={(value) => {
            const [searchMode, caseMode] = value.split(":") as [SearchMode, CaseMode];
            updateOptions({ searchMode, caseMode });
          }}
        >
          <List.Dropdown.Section title="Plain Text">
            <List.Dropdown.Item title="Text · Smart Case" value="text:smart" />
            <List.Dropdown.Item title="Text · Case Sensitive" value="text:sensitive" />
            <List.Dropdown.Item title="Text · Ignore Case" value="text:insensitive" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Regular Expression">
            <List.Dropdown.Item title="Regex · Smart Case" value="regex:smart" />
            <List.Dropdown.Item title="Regex · Case Sensitive" value="regex:sensitive" />
            <List.Dropdown.Item title="Regex · Ignore Case" value="regex:insensitive" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {search.results.length === 0 || directory === null ? (
        <List.EmptyView icon={empty.icon} title={empty.title} description={empty.description} actions={actions} />
      ) : (
        <List.Section title={`${engineLabel} · ${countLabel}`} subtitle={sectionSubtitle}>
          {search.results.map((result, index) => {
            const position = `${result.line}:${result.column}`;
            return (
              <List.Item
                key={`${result.filePath}:${position}:${index}`}
                icon={{ fileIcon: result.filePath }}
                title={showDetail ? result.fileName : result.lineText.trim() || result.fileName}
                subtitle={
                  showDetail ? undefined : { value: `${result.relativePath}:${position}`, tooltip: result.filePath }
                }
                accessories={showDetail ? [{ text: position }] : undefined}
                detail={
                  showDetail ? (
                    <List.Item.Detail
                      markdown={resultDetailMarkdown(result, search.query, options)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="File" text={result.fileName} />
                          <List.Item.Detail.Metadata.Label title="Path" text={result.relativePath} />
                          <List.Item.Detail.Metadata.Label
                            title="Position"
                            text={`line ${result.line}, column ${result.column}`}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Engine" text={engineLabel} />
                          <List.Item.Detail.Metadata.Label title="Directory" text={directory.path} />
                          <List.Item.Detail.Metadata.Label title="Source" text={SOURCE_LABELS[directory.source]} />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={resultActions(result)}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
