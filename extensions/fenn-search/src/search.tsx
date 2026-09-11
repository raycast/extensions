import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { useEffect, useRef, useState } from "react";
import { FennError, searchFenn } from "./fenn-client";
import { FENN_MIN_VERSION } from "./fenn-config";
import { FennSetupActions, useFennInstallation } from "./fenn-setup";
import { fileTypeAppearance, resultAppearance } from "./file-appearance";
import { useRoundedPreview } from "./use-rounded-preview";
import {
  FILE_TYPES,
  fileTypeLabel,
  isSearchMode,
  ResultSection,
  resultMarkdown,
  resultMatches,
  resultPlainText,
  SEARCH_MODES,
  SearchResult,
} from "./search-model";

function FileTypePicker({
  selected,
  onApply,
}: {
  selected: string[];
  onApply: (types: string[]) => void;
}) {
  const [types, setTypes] = useState(selected);
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Filter File Types"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Filters"
            onSubmit={() => {
              onApply(types);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose one or more file types. Leave the selection empty to search all types." />
      <Form.TagPicker
        id="fileTypes"
        title="File Types"
        value={types}
        onChange={setTypes}
      >
        {FILE_TYPES.map((type) => (
          <Form.TagPicker.Item
            key={type.value}
            value={type.value}
            title={type.title}
            icon={fileTypeAppearance(type.value).icon}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

type SearchActionsProps = {
  fileTypes: string[];
  onFilter: (types: string[]) => void;
  onRetry: () => void;
  result?: SearchResult;
  showMetadata: boolean;
  onToggleMetadata: () => void;
  app: ReturnType<typeof useFennInstallation>;
  error?: Error;
};

function SearchActions({
  fileTypes,
  onFilter,
  onRetry,
  result,
  showMetadata,
  onToggleMetadata,
  app,
  error,
}: SearchActionsProps) {
  const localFile = result && isAbsolute(result.original_file);
  const setupFirst = !result && (app === null || error instanceof FennError);
  const setupActions = (
    <ActionPanel.Section title="Fenn Setup">
      <FennSetupActions
        app={app}
        needsUpdate={error instanceof FennError && error.kind === "update"}
        onRetry={onRetry}
      />
    </ActionPanel.Section>
  );
  return (
    <ActionPanel>
      {setupFirst && setupActions}
      {result && (
        <ActionPanel.Section>
          {localFile && (
            <Action.Open title="Open File" target={result.original_file} />
          )}
          <Action.CopyToClipboard
            title="Copy Match Details"
            content={resultPlainText(result)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {localFile && (
            <Action.ShowInFinder
              path={result.original_file}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          )}
          <Action.CopyToClipboard
            title="Copy File Path"
            content={result.original_file}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action
            title={
              showMetadata ? "Hide File Information" : "Show File Information"
            }
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={onToggleMetadata}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action.Push
          title="Filter File Types…"
          icon={Icon.Filter}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          target={<FileTypePicker selected={fileTypes} onApply={onFilter} />}
        />
        {fileTypes.length > 0 && (
          <Action
            title="Clear File Type Filters"
            icon={Icon.XMarkCircle}
            onAction={() => onFilter([])}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          />
        )}
        <Action
          title="Retry Search"
          icon={Icon.ArrowClockwise}
          onAction={onRetry}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      </ActionPanel.Section>
      {!setupFirst && setupActions}
      <ActionPanel.Section>
        <Action
          title="Extension Settings"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function SearchFennCommand() {
  const { apiToken } = getPreferenceValues<{ apiToken?: string }>();
  const [query, setQuery] = useState("");
  const [savedMode, setMode] = useCachedState<string>(
    "search-mode",
    "discover",
  );
  const mode = isSearchMode(savedMode) ? savedMode : "discover";
  const [savedFileTypes, setFileTypes] = useCachedState<string[]>(
    "file-types",
    [],
  );
  const fileTypes = savedFileTypes.filter((value) =>
    FILE_TYPES.some((type) => type.value === value),
  );
  const filterKey = JSON.stringify(fileTypes);
  const [sections, setSections] = useState<ResultSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const [revision, setRevision] = useState(0);
  const app = useFennInstallation(revision);
  const [showMetadata, setShowMetadata] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const clientId = useRef(randomUUID());
  const requestId = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    setSections([]);
    setError(undefined);
    const text = query.trim();
    if (!text || text.length > 1000) {
      setIsLoading(false);
      if (text.length > 1000)
        setError(new Error("Keep your query under 1,001 characters."));
      return () => controller.abort();
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const next = await searchFenn(
          {
            query: text,
            mode,
            fileTypes: JSON.parse(filterKey),
            clientId: clientId.current,
            requestId: id,
          },
          apiToken,
          controller.signal,
        );
        if (!controller.signal.aborted && requestId.current === id)
          setSections(next);
      } catch (cause) {
        if (!controller.signal.aborted && requestId.current === id) {
          setError(
            cause instanceof Error
              ? cause
              : new Error("Search failed. Please retry."),
          );
        }
      } finally {
        if (!controller.signal.aborted && requestId.current === id)
          setIsLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, mode, filterKey, revision, apiToken]);

  // Hide stale results immediately on user input, before the next effect runs.
  function invalidate() {
    activeRequest.current?.abort();
    setSections([]);
    setError(undefined);
  }

  const filterLabel = fileTypeLabel(fileTypes);
  const count = sections.reduce(
    (sum, section) => sum + section.results.length,
    0,
  );
  const selectedResult = sections
    .flatMap((section) =>
      section.results.map((result, index) => ({
        result,
        id: resultId(section, result, index),
      })),
    )
    .find((item) => item.id === selectedId)?.result;
  const roundedPreview = useRoundedPreview(selectedResult?.generated_file);
  const actions = {
    fileTypes,
    app,
    error,
    showMetadata,
    onToggleMetadata: () => setShowMetadata((value) => !value),
    onFilter: (types: string[]) => {
      if (JSON.stringify(types) === filterKey) return;
      invalidate();
      setFileTypes(types);
    },
    onRetry: () => {
      invalidate();
      setRevision((value) => value + 1);
    },
  };

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={count > 0}
      onSelectionChange={setSelectedId}
      searchText={query}
      onSearchTextChange={(value) => {
        if (value === query) return;
        invalidate();
        setQuery(value);
      }}
      searchBarPlaceholder={`Search Fenn · ${filterLabel}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Mode"
          value={mode}
          onChange={(value) => {
            if (value === mode) return;
            invalidate();
            setMode(value);
          }}
        >
          {SEARCH_MODES.map((item) => (
            <List.Dropdown.Item
              key={item.value}
              title={item.title}
              value={item.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : "icon.png"}
        title={
          error
            ? app === null &&
              error instanceof FennError &&
              ["setup", "connection"].includes(error.kind)
              ? "Install Fenn to Get Started"
              : error instanceof FennError
                ? error.title
                : "Search Unavailable"
            : isLoading
              ? "Searching Fenn…"
              : query.trim()
                ? "No Matches"
                : app === null
                  ? "Search Your Files with Fenn"
                  : "Find What’s Inside Your Files"
        }
        description={
          error?.message ??
          (isLoading
            ? `${filterLabel} · ${SEARCH_MODES.find((item) => item.value === mode)?.title}`
            : query.trim()
              ? `Try another query or clear file-type filters. Check that your folders and file types are enabled in Fenn’s Sources and indexing has finished. Current filter: ${filterLabel}.`
              : app === null
                ? `Download Fenn ${FENN_MIN_VERSION} or newer, activate your license, and add a folder to index. Setup help: ⌘⇧H.`
                : `Requires Fenn ${FENN_MIN_VERSION} or newer, running with indexed files. Choose a mode with ⌘P or file types with ⌘⇧F. Setup help: ⌘⇧H.`)
        }
        actions={<SearchActions {...actions} />}
      />
      {sections
        .filter((section) => section.results.length > 0)
        .map((section) => (
          <List.Section
            key={section.key}
            title={section.title}
            subtitle={`${section.results.length} results · ${filterLabel}`}
          >
            {section.results.map((result, index) => {
              const matches = resultMatches(result);
              const visual = resultAppearance(result);
              return (
                <List.Item
                  key={`${section.key}:${result.original_file}:${result.mbox_index ?? ""}:${index}`}
                  id={resultId(section, result, index)}
                  title={result.filename}
                  subtitle={
                    matches.length
                      ? `${matches[0].label}${matches.length > 1 ? ` +${matches.length - 1}` : ""}`
                      : undefined
                  }
                  icon={visual.icon}
                  detail={
                    <List.Item.Detail
                      markdown={resultMarkdown(
                        result,
                        result === selectedResult ? roundedPreview : undefined,
                      )}
                      metadata={
                        showMetadata ? (
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label
                              title="Format"
                              text={visual.label}
                              icon={visual.icon}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Path"
                              text={result.original_file}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Search Mode"
                              text={
                                mode === "discover"
                                  ? `Discover · ${section.title}`
                                  : SEARCH_MODES.find(
                                      (item) => item.value === mode,
                                    )?.title
                              }
                            />
                            <List.Item.Detail.Metadata.Label
                              title="File Types"
                              text={filterLabel}
                            />
                            {matches.length > 0 && (
                              <List.Item.Detail.Metadata.Label
                                title="Returned Matches"
                                text={`${matches.length}${matches.length === 50 ? " (display limit)" : ""}`}
                              />
                            )}
                          </List.Item.Detail.Metadata>
                        ) : undefined
                      }
                    />
                  }
                  actions={<SearchActions {...actions} result={result} />}
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}

function resultId(section: ResultSection, result: SearchResult, index: number) {
  return `${section.key}:${result.original_file}:${result.mbox_index ?? ""}:${index}`;
}
