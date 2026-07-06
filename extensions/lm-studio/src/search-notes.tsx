import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import os from "node:os";
import path from "node:path";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_KNOWLEDGE_CHUNKS,
  MAX_NOTE_FILE_BYTES,
  buildKnowledgeIndex,
  clearKnowledgeData,
  getKnowledgeSettings,
  loadKnowledgeIndex,
  searchKnowledge,
  type EmbeddingFunction,
  type KnowledgeIndex,
  type KnowledgeIndexProgress,
  type KnowledgeSearchResult,
  type KnowledgeSettings,
} from "./lib/knowledge";
import { createClient, friendlyError } from "./lib/raycast";
import { preferredModel, useLMStudioModels } from "./lib/use-models";
import type { LMStudioModel } from "./types";

type Client = ReturnType<typeof createClient>;

const HOME_DIRECTORY = os.homedir();

function displayPath(filePath: string) {
  if (filePath === HOME_DIRECTORY) return "~";
  return filePath.startsWith(`${HOME_DIRECTORY}${path.sep}`) ? `~${filePath.slice(HOME_DIRECTORY.length)}` : filePath;
}

function embeddingFunction(client: Client): EmbeddingFunction {
  return async (texts, model, signal) => {
    const result = await client.embeddings({ model, input: texts, signal });
    return [...result.data].sort((left, right) => left.index - right.index).map((item) => item.embedding);
  };
}

function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function resultTitle(result: KnowledgeSearchResult) {
  const firstLine = result.excerpt
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean);
  return firstLine?.slice(0, 100) || path.basename(result.path);
}

function resultMarkdown(result: KnowledgeSearchResult) {
  const location = `${displayPath(result.path)}:${result.startLine}${result.endLine === result.startLine ? "" : `–${result.endLine}`}`;
  const otherSources = result.sources.slice(1, 6);
  const undisplayedSourceCount = Math.max(0, result.sources.length - otherSources.length - 1);
  return [
    `# ${path.basename(result.path)}`,
    "",
    result.excerpt,
    "",
    "---",
    "",
    `**Source:** \`${location.replaceAll("`", "\\`")}\``,
    otherSources.length > 0
      ? `\n**Also found in:**\n${otherSources.map((source) => `- \`${displayPath(source.path)}:${source.startLine}\``).join("\n")}${
          undisplayedSourceCount > 0
            ? `\n- _${undisplayedSourceCount.toLocaleString()} more source${undisplayedSourceCount === 1 ? "" : "s"}_`
            : ""
        }`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function chatPrefill(query: string, result: KnowledgeSearchResult) {
  return [
    `Use the following local note excerpt to help with this request: ${query}`,
    "",
    `Source: ${result.path}:${result.startLine}-${result.endLine}`,
    "",
    result.excerpt,
  ].join("\n");
}

async function runIndex(
  client: Client,
  folders: string[],
  model: string,
  onProgress?: (progress: KnowledgeIndexProgress) => void,
) {
  return buildKnowledgeIndex({
    folders,
    model,
    embed: embeddingFunction(client),
    onProgress,
  });
}

function ConfigureIndexForm(props: {
  client: Client;
  models: LMStudioModel[];
  settings: KnowledgeSettings;
  onIndexed: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const initialModel = props.models.some((model) => model.key === props.settings.embeddingModel)
    ? props.settings.embeddingModel
    : preferredModel(props.models)?.key;
  const [folders, setFolders] = useState(props.settings.folders);
  const [model, setModel] = useState(initialModel ?? "");
  const [folderError, setFolderError] = useState<string>();
  const [modelError, setModelError] = useState<string>();
  const [isIndexing, setIsIndexing] = useState(false);

  async function submit() {
    setFolderError(folders.length > 0 ? undefined : "Choose at least one folder.");
    setModelError(model ? undefined : "Choose an embedding model.");
    if (folders.length === 0 || !model) return;

    setIsIndexing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Indexing Notes…",
    });
    try {
      const result = await runIndex(props.client, folders, model, (progress) => {
        toast.title = progress.phase === "saving" ? "Saving Note Index…" : "Indexing Notes…";
        toast.message = progress.message;
      });
      toast.style = Toast.Style.Success;
      toast.title = "Notes Indexed";
      toast.message = `${result.index.files.length.toLocaleString()} files · ${result.index.chunks.length.toLocaleString()} unique chunks${
        result.truncated ? ` · capped at ${MAX_KNOWLEDGE_CHUNKS.toLocaleString()}` : ""
      }`;
      await props.onIndexed();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Index Notes";
      toast.message = friendlyError(error);
    } finally {
      setIsIndexing(false);
    }
  }

  return (
    <Form
      navigationTitle="Configure Note Index"
      isLoading={isIndexing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Index Notes" icon={Icon.MagnifyingGlass} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Note Folders"
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection
        showHiddenFiles={false}
        value={folders}
        error={folderError}
        onChange={(value) => {
          setFolders(value);
          if (value.length > 0) setFolderError(undefined);
        }}
      />
      <Form.Dropdown
        id="model"
        title="Embedding Model"
        value={model}
        error={modelError}
        onChange={(value) => {
          setModel(value);
          if (value) setModelError(undefined);
        }}
      >
        {props.models.map((availableModel) => (
          <Form.Dropdown.Item
            key={availableModel.key}
            value={availableModel.key}
            title={availableModel.displayName || availableModel.key}
          />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Privacy"
        text="Only the folders selected above are scanned. Hidden folders and symlinks are ignored. Note chunks are sent to your configured LM Studio server for embedding, then the index is stored in Raycast's local extension storage. A remote server URL sends those chunks off this Mac."
      />
      <Form.Description
        title="Limits"
        text={`Markdown, MDX, and text files only · ${formatBytes(MAX_NOTE_FILE_BYTES)} per file · ${MAX_KNOWLEDGE_CHUNKS.toLocaleString()} unique chunks per index`}
      />
    </Form>
  );
}

function ResultActions(props: { result: KnowledgeSearchResult; query: string }) {
  return (
    <ActionPanel>
      <Action.Open title="Open Note" target={props.result.path} />
      <Action
        title="Continue in Chat"
        icon={Icon.Message}
        onAction={() =>
          launchCommand({
            name: "chat",
            type: LaunchType.UserInitiated,
            context: { prefill: chatPrefill(props.query, props.result) },
          })
        }
      />
      <Action.CopyToClipboard title="Copy Excerpt" content={props.result.excerpt} />
      <Action.CopyToClipboard title="Copy Source Path" content={props.result.path} />
      <Action.ShowInFinder path={props.result.path} />
    </ActionPanel>
  );
}

function SearchResultItem(props: { result: KnowledgeSearchResult; query: string }) {
  return (
    <List.Item
      id={props.result.id}
      icon={Icon.Document}
      title={resultTitle(props.result)}
      subtitle={path.basename(props.result.path)}
      accessories={[{ text: `${Math.round(props.result.score * 100)}%` }]}
      detail={
        <List.Item.Detail
          markdown={resultMarkdown(props.result)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Source" text={displayPath(props.result.path)} />
              <List.Item.Detail.Metadata.Label
                title="Lines"
                text={
                  props.result.startLine === props.result.endLine
                    ? String(props.result.startLine)
                    : `${props.result.startLine}–${props.result.endLine}`
                }
              />
              <List.Item.Detail.Metadata.Label title="Similarity" text={props.result.score.toFixed(3)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ResultActions result={props.result} query={props.query} />}
    />
  );
}

function IndexStatusItem(props: { index: KnowledgeIndex; actions: List.Item.Props["actions"] }) {
  const markdown = [
    "# Local Note Index",
    "",
    `Search across **${props.index.files.length.toLocaleString()} files** and **${props.index.chunks.length.toLocaleString()} unique chunks**.`,
    "",
    "Start typing in the search field to find related passages.",
    "",
    "## Indexed Folders",
    "",
    ...props.index.folders.map((folder) => `- \`${displayPath(folder).replaceAll("`", "\\`")}\``),
  ].join("\n");

  return (
    <List.Item
      id="knowledge-index-status"
      icon={Icon.Folder}
      title={`${props.index.files.length.toLocaleString()} files indexed`}
      subtitle={props.index.model}
      accessories={[{ text: `${props.index.chunks.length.toLocaleString()} chunks` }]}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Embedding Model" text={props.index.model} />
              <List.Item.Detail.Metadata.Label title="Dimensions" text={String(props.index.dimension)} />
              <List.Item.Detail.Metadata.Label
                title="Last Indexed"
                text={new Date(props.index.updatedAt).toLocaleString()}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={props.actions}
    />
  );
}

export default function SearchNotesCommand() {
  const {
    client,
    models,
    isLoading: areModelsLoading,
    error: modelError,
    refresh: refreshModels,
  } = useLMStudioModels("embedding");
  const [settings, setSettings] = useState<KnowledgeSettings>({ folders: [] });
  const [index, setIndex] = useState<KnowledgeIndex>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [error, setError] = useState<string>();
  const embed = useMemo(() => embeddingFunction(client), [client]);

  const reloadIndex = useCallback(async () => {
    setIsLoadingIndex(true);
    try {
      const nextSettings = await getKnowledgeSettings();
      const nextIndex = await loadKnowledgeIndex({
        model: nextSettings.embeddingModel,
      });
      setSettings(nextSettings);
      setIndex(nextIndex);
      setError(undefined);
    } catch (caughtError) {
      setError(friendlyError(caughtError));
    } finally {
      setIsLoadingIndex(false);
    }
  }, []);

  useEffect(() => {
    void reloadIndex();
  }, [reloadIndex]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery || !index) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsSearching(true);
      setError(undefined);
      void searchKnowledge(cleanQuery, {
        model: index.model,
        limit: DEFAULT_SEARCH_LIMIT,
        embed,
        signal: controller.signal,
      })
        .then(setResults)
        .catch((caughtError) => {
          if (!controller.signal.aborted) {
            setResults([]);
            setError(friendlyError(caughtError));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [embed, index, query]);

  async function reindex() {
    if (!settings.embeddingModel || settings.folders.length === 0) return;
    setIsReindexing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reindexing Notes…",
    });
    try {
      const result = await runIndex(client, settings.folders, settings.embeddingModel, (progress) => {
        toast.message = progress.message;
      });
      toast.style = Toast.Style.Success;
      toast.title = "Notes Reindexed";
      toast.message = `${result.index.files.length.toLocaleString()} files · ${result.index.chunks.length.toLocaleString()} unique chunks`;
      await reloadIndex();
    } catch (caughtError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Reindex Notes";
      toast.message = friendlyError(caughtError);
    } finally {
      setIsReindexing(false);
    }
  }

  async function eraseAll() {
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: "Erase the Local Note Index?",
      message:
        "This removes all indexed vectors and forgets the selected folders. Your original note files are not changed.",
      primaryAction: {
        title: "Erase Index",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await clearKnowledgeData();
      setSettings({ folders: [] });
      setIndex(undefined);
      setResults([]);
      setQuery("");
      await showToast({
        style: Toast.Style.Success,
        title: "Note Index Erased",
      });
    } catch (caughtError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Erase Note Index",
        message: friendlyError(caughtError),
      });
    }
  }

  const configureAction = (
    <Action.Push
      title={index ? "Change Indexed Folders" : "Choose Folders and Index"}
      icon={Icon.Gear}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ConfigureIndexForm client={client} models={models} settings={settings} onIndexed={reloadIndex} />}
    />
  );

  const indexActions = (
    <ActionPanel>
      {configureAction}
      {index ? (
        <Action
          title="Reindex Notes"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={reindex}
        />
      ) : null}
      <Action title="Refresh Models" icon={Icon.ArrowClockwise} onAction={refreshModels} />
      {index ? (
        <Action
          title="Erase Note Index"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={eraseAll}
        />
      ) : null}
    </ActionPanel>
  );

  const visibleError = error ?? modelError;
  const hasQuery = Boolean(query.trim());

  return (
    <List
      navigationTitle="Search Notes"
      searchBarPlaceholder="Search your indexed notes…"
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail
      isLoading={areModelsLoading || isLoadingIndex || isSearching || isReindexing}
    >
      {!index ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Index Notes to Search"
          description={
            visibleError ??
            (models.length === 0
              ? "Download an embedding model in LM Studio, then choose the note folders you want to index."
              : "Choose one or more folders. Only supported text notes are read, and indexing stays local.")
          }
          actions={indexActions}
        />
      ) : hasQuery && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={visibleError ? "Search Failed" : "No Related Notes Found"}
          description={visibleError ?? "Try a broader search or reindex your note folders."}
          actions={indexActions}
        />
      ) : hasQuery ? (
        results.map((result) => <SearchResultItem key={result.id} result={result} query={query.trim()} />)
      ) : (
        <IndexStatusItem index={index} actions={indexActions} />
      )}
    </List>
  );
}
