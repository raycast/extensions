import {
  Action,
  ActionPanel,
  Cache,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { ConfiguredBlockSet, BlockFile, BlockSetLoadFailure } from "../types";
import { copyBlockFile } from "../services/clipboard";
import { listBlockFilesFromBlockSets } from "../services/markdownFiles";
import { readBlockPreview } from "../services/preview";

type Props = {
  blockSets: ConfiguredBlockSet[];
  searchBarPlaceholder: string;
  emptyTitle: string;
};

type LoadState = {
  files: BlockFile[];
  failures: BlockSetLoadFailure[];
  error?: string;
  isLoading: boolean;
};

type PreviewOptions = {
  isEnabled: boolean;
  lineCount: number;
  maxCharacters: number;
};

type SortMode = "updated-desc" | "updated-asc" | "name-asc" | "path-asc";

const DEFAULT_PREVIEW_LINE_COUNT = 10;
const DEFAULT_PREVIEW_MAX_CHARACTERS = 4000;
const DEFAULT_PREVIEW_ENABLED = true;
const DEFAULT_SORT_MODE: SortMode = "updated-desc";
const MAX_PREVIEW_LINE_COUNT = 100;
const MAX_PREVIEW_CHARACTERS = 20000;
const PREVIEW_ENABLED_CACHE_KEY = "local-copy-blocks.preview.enabled";
const previewVisibilityCache = new Cache();

export function BlockFileList({ blockSets, searchBarPlaceholder, emptyTitle }: Props) {
  const [state, setState] = useState<LoadState>({ files: [], failures: [], isLoading: true });
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(readInitialPreviewVisibility);
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const previewOptions = getPreviewOptions(preferences, isPreviewEnabled);

  async function togglePreviewVisibility() {
    const previousIsEnabled = isPreviewEnabled;
    const nextIsEnabled = !isPreviewEnabled;
    setIsPreviewEnabled(nextIsEnabled);

    try {
      previewVisibilityCache.set(PREVIEW_ENABLED_CACHE_KEY, String(nextIsEnabled));
    } catch (error) {
      setIsPreviewEnabled(previousIsEnabled);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save preview setting",
        message: getErrorMessage(error),
      });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadFiles() {
      try {
        const result = await listBlockFilesFromBlockSets(blockSets);
        const successfulBlockSetCount = blockSets.length - result.failures.length;

        if (isMounted) {
          if (result.failures.length > 0 && successfulBlockSetCount === 0) {
            setState({
              files: [],
              failures: result.failures,
              error: formatBlockSetFailureMessages(result.failures),
              isLoading: false,
            });
            return;
          }

          setState({ files: result.files, failures: result.failures, isLoading: false });
        }

        if (isMounted && result.failures.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Some Block Sets could not be loaded",
            message: formatBlockSetFailureNames(result.failures),
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({ files: [], failures: [], error: getErrorMessage(error), isLoading: false });
        }
      }
    }

    loadFiles();

    return () => {
      isMounted = false;
    };
  }, [blockSets]);

  const filesByBlockSet = useMemo(() => {
    return blockSets.map((blockSet) => ({
      blockSet,
      files: state.files
        .filter((file) => file.blockSet.id === blockSet.id)
        .sort((left, right) => compareBlockFiles(left, right, sortMode)),
    }));
  }, [blockSets, sortMode, state.files]);

  const fileCount = filesByBlockSet.reduce((count, group) => count + group.files.length, 0);
  const failures = state.failures;

  return (
    <List
      isLoading={state.isLoading}
      isShowingDetail={previewOptions.isEnabled}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          defaultValue={DEFAULT_SORT_MODE}
          storeValue
          onChange={(value) => setSortMode(parseSortMode(value))}
        >
          <List.Dropdown.Item title="Updated (Newest First)" value="updated-desc" />
          <List.Dropdown.Item title="Updated (Oldest First)" value="updated-asc" />
          <List.Dropdown.Item title="Name (A-Z)" value="name-asc" />
          <List.Dropdown.Item title="Path (A-Z)" value="path-asc" />
        </List.Dropdown>
      }
    >
      {state.error ? (
        <List.EmptyView
          title="Could not load Markdown-backed text blocks"
          description={state.error}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : fileCount === 0 && failures.length === 0 && !state.isLoading ? (
        <List.EmptyView
          title={emptyTitle}
          description="No .md files were found in the enabled block set folders."
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : blockSets.length > 1 ? (
        <>
          {filesByBlockSet
            .filter((group) => group.files.length > 0)
            .map((group) => (
              <List.Section key={group.blockSet.id} title={group.blockSet.displayName}>
                {group.files.map((file) => (
                  <BlockFileListItem
                    key={file.path}
                    file={file}
                    editor={preferences.editor}
                    onTogglePreview={togglePreviewVisibility}
                    previewOptions={previewOptions}
                  />
                ))}
              </List.Section>
            ))}
          {failures.length > 0 ? (
            <List.Section title="Could Not Load">
              {failures.map((failure) => (
                <BlockSetFailureListItem key={failure.blockSet.id} failure={failure} />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : (
        filesByBlockSet.flatMap((group) =>
          group.files.map((file) => (
            <BlockFileListItem
              key={file.path}
              file={file}
              editor={preferences.editor}
              onTogglePreview={togglePreviewVisibility}
              previewOptions={previewOptions}
            />
          )),
        )
      )}
    </List>
  );
}

function BlockSetFailureListItem({ failure }: { failure: BlockSetLoadFailure }) {
  return (
    <List.Item
      id={`block-set-load-failure-${failure.blockSet.id}`}
      icon={Icon.Warning}
      title={failure.blockSet.displayName}
      subtitle={failure.message}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function BlockFileListItem({
  file,
  editor,
  onTogglePreview,
  previewOptions,
}: {
  file: BlockFile;
  editor: ExtensionPreferences["editor"];
  onTogglePreview: () => void | Promise<void>;
  previewOptions: PreviewOptions;
}) {
  const isPreviewEnabled = previewOptions.isEnabled;

  return (
    <List.Item
      id={file.path}
      title={file.name}
      subtitle={getListItemSubtitle(file)}
      accessories={isPreviewEnabled ? undefined : getListItemAccessories(file)}
      detail={isPreviewEnabled ? <BlockFilePreviewDetail file={file} previewOptions={previewOptions} /> : undefined}
      actions={
        <ActionPanel>
          <Action icon={Icon.Clipboard} title="Copy Raw Content" onAction={() => handleCopy(file, false)} />
          <Action icon={Icon.Replace} title="Copy Expanded Content" onAction={() => handleCopy(file, true)} />
          <Action
            icon={isPreviewEnabled ? Icon.EyeDisabled : Icon.Eye}
            title={isPreviewEnabled ? "Hide Preview" : "Show Preview"}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={onTogglePreview}
          />
          {editor ? (
            <Action.Open icon={Icon.Pencil} title="Open in Editor" target={file.path} application={editor} />
          ) : (
            <Action.Open icon={Icon.Document} title="Open" target={file.path} />
          )}
          <Action.OpenWith title="Open with…" path={file.path} />
          <Action.ShowInFinder path={file.path} />
        </ActionPanel>
      }
    />
  );
}

function BlockFilePreviewDetail({ file, previewOptions }: { file: BlockFile; previewOptions: PreviewOptions }) {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      setMarkdown("");

      try {
        const preview = await readBlockPreview(file.path, {
          lineCount: previewOptions.lineCount,
          maxCharacters: previewOptions.maxCharacters,
        });

        if (isMounted) {
          setMarkdown(formatPreviewMarkdown(file, preview));
        }
      } catch (error) {
        if (isMounted) {
          setMarkdown(`# ${file.name}\n\nCould not load preview.\n\n${getErrorMessage(error)}`);
        }
      }
    }

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [file, previewOptions.lineCount, previewOptions.maxCharacters]);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Block Set" text={file.blockSet.displayName} />
          <List.Item.Detail.Metadata.Label title="Relative Path" text={file.relativePath} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(file.size)} />
          <List.Item.Detail.Metadata.Label title="Updated" text={formatDateTime(file.updatedAt)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Full Path" text={file.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

async function handleCopy(file: BlockFile, expand: boolean): Promise<void> {
  try {
    await copyBlockFile(file, { expand });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy content",
      message: getErrorMessage(error),
    });
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatListDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function compareBlockFiles(left: BlockFile, right: BlockFile, sortMode: SortMode): number {
  switch (sortMode) {
    case "updated-desc":
      return right.updatedAt.getTime() - left.updatedAt.getTime() || compareByRelativePath(left, right);
    case "updated-asc":
      return left.updatedAt.getTime() - right.updatedAt.getTime() || compareByRelativePath(left, right);
    case "name-asc":
      return left.name.localeCompare(right.name) || compareByRelativePath(left, right);
    case "path-asc":
      return compareByRelativePath(left, right);
  }
}

function compareByRelativePath(left: BlockFile, right: BlockFile): number {
  return left.relativePath.localeCompare(right.relativePath);
}

function parseSortMode(value: string): SortMode {
  if (value === "name-asc" || value === "path-asc" || value === "updated-desc" || value === "updated-asc") {
    return value;
  }

  return DEFAULT_SORT_MODE;
}

function getListItemAccessories(file: BlockFile): List.Item.Accessory[] {
  return [{ text: formatListDateTime(file.updatedAt) }, { text: formatFileSize(file.size) }];
}

function getListItemSubtitle(file: BlockFile): string | undefined {
  return getParentDirectory(file.relativePath);
}

function getParentDirectory(relativePath: string): string | undefined {
  const pathParts = relativePath.split("/");
  pathParts.pop();
  const parentDirectory = pathParts.join("/");

  return parentDirectory || undefined;
}

function formatBlockSetFailureNames(failures: BlockSetLoadFailure[]): string {
  return failures.map((failure) => failure.blockSet.displayName).join(", ");
}

function formatBlockSetFailureMessages(failures: BlockSetLoadFailure[]): string {
  return failures.map((failure) => `${failure.blockSet.displayName}: ${failure.message}`).join("\n");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getPreviewOptions(preferences: ExtensionPreferences, isEnabled: boolean): PreviewOptions {
  return {
    isEnabled,
    lineCount: parsePositiveInteger(preferences.previewLineCount, DEFAULT_PREVIEW_LINE_COUNT, MAX_PREVIEW_LINE_COUNT),
    maxCharacters: parsePositiveInteger(
      preferences.previewMaxCharacters,
      DEFAULT_PREVIEW_MAX_CHARACTERS,
      MAX_PREVIEW_CHARACTERS,
    ),
  };
}

function parsePositiveInteger(value: string | undefined, defaultValue: number, maxValue: number): number {
  const parsedValue = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return defaultValue;
  }

  return Math.min(parsedValue, maxValue);
}

function readInitialPreviewVisibility(): boolean {
  const storedValue = previewVisibilityCache.get(PREVIEW_ENABLED_CACHE_KEY);

  if (storedValue === "true") {
    return true;
  }

  if (storedValue === "false") {
    return false;
  }

  return DEFAULT_PREVIEW_ENABLED;
}

function formatPreviewMarkdown(file: BlockFile, preview: string): string {
  const previewContent = preview.trimEnd() || "(Empty file)";
  const indentedPreview = previewContent
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");

  return [`# ${file.name}`, "", indentedPreview].join("\n");
}
