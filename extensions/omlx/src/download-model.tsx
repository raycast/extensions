import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRecommendedModels,
  isOmlxInstalled,
  isServerRunning,
  notifyIfUpdateAvailable,
  searchHfModels,
  searchMsModels,
  startHfDownload,
  startMsDownload,
  type HfSearchResult,
  type RecommendedModels,
} from "./lib/omlx";

type ViewState = "idle" | "loading" | "not-installed" | "offline" | "ready";
type Source = "huggingface" | "modelscope";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const SOURCE_CONFIG = {
  huggingface: {
    search: (q: string, limit: number, mlxOnly: boolean) =>
      searchHfModels(q, limit, mlxOnly),
    download: startHfDownload,
    placeholder: "Search models on HuggingFace...",
    idleTitle: "Search for Models on HuggingFace",
    browserUrl: (id: string) => `https://huggingface.co/${id}`,
    browserTitle: "Open on HuggingFace",
  },
  modelscope: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    search: (q: string, limit: number, mlxOnly: boolean) =>
      searchMsModels(q, limit),
    download: startMsDownload,
    placeholder: "Search models on ModelScope...",
    idleTitle: "Search for Models on ModelScope",
    browserUrl: (id: string) => `https://modelscope.cn/models/${id}`,
    browserTitle: "Open on ModelScope",
  },
} as const;

export default function DownloadModel() {
  const [results, setResults] = useState<HfSearchResult[]>([]);
  const [recommended, setRecommended] = useState<RecommendedModels | null>(
    null,
  );
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [source, setSource] = useState<Source>("huggingface");
  const [mlxOnly, setMlxOnly] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef("");

  useEffect(() => {
    (async () => {
      if (!isOmlxInstalled()) {
        setViewState("not-installed");
        return;
      }
      const running = await isServerRunning();
      if (!running) {
        setViewState("offline");
        return;
      }
      setViewState("idle");
      notifyIfUpdateAvailable();
      fetchRecommendedModels()
        .then(setRecommended)
        .catch(() => {});
    })();
  }, []);

  const doSearch = useCallback((text: string, src: Source, mlx: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!text.trim()) {
      setResults([]);
      setViewState("idle");
      return;
    }

    setViewState("loading");
    timerRef.current = setTimeout(async () => {
      try {
        const models = await SOURCE_CONFIG[src].search(text.trim(), 20, mlx);
        setResults(models);
        setViewState("ready");
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setViewState("ready");
      }
    }, 300);
  }, []);

  const onSearchTextChange = useCallback(
    (text: string) => {
      queryRef.current = text;
      doSearch(text, source, mlxOnly);
    },
    [source, mlxOnly, doSearch],
  );

  const onSourceChange = useCallback(
    (newSource: string) => {
      const src = newSource as Source;
      setSource(src);
      setResults([]);
      if (queryRef.current.trim()) {
        doSearch(queryRef.current, src, mlxOnly);
      } else {
        setViewState("idle");
      }
    },
    [mlxOnly, doSearch],
  );

  const toggleMlxOnly = useCallback(() => {
    const next = !mlxOnly;
    setMlxOnly(next);
    if (queryRef.current.trim()) {
      doSearch(queryRef.current, source, next);
    }
  }, [mlxOnly, source, doSearch]);

  const config = SOURCE_CONFIG[source];

  if (viewState === "not-installed") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="oMLX Not Found"
          description="Install oMLX from omlx.com, then launch it once."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Download oMLX"
                url="https://omlx.com"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (viewState === "offline") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="oMLX Server Offline"
          description="Start the server with Start/Stop Server."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={viewState === "loading"}
      onSearchTextChange={onSearchTextChange}
      searchBarPlaceholder={config.placeholder}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Model Source"
          value={source}
          onChange={onSourceChange}
        >
          <List.Dropdown.Item title="HuggingFace" value="huggingface" />
          <List.Dropdown.Item title="ModelScope" value="modelscope" />
        </List.Dropdown>
      }
    >
      {viewState === "ready" && results.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Models Found"
          description="Try a different search query."
        />
      )}
      {viewState === "idle" && results.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={config.idleTitle}
          description="Type a query to find models available for download."
          actions={
            source === "huggingface" && recommended ? (
              <ActionPanel>
                <Action
                  title="View Trending Models"
                  icon={Icon.Star}
                  onAction={() => {
                    setResults(recommended.trending);
                    setViewState("ready");
                  }}
                />
                <Action
                  title="View Popular Models"
                  icon={Icon.Heart}
                  onAction={() => {
                    setResults(recommended.popular);
                    setViewState("ready");
                  }}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
      {results.map((model) => (
        <ModelListItem
          key={`${source}:${model.repo_id}`}
          model={model}
          config={config}
          source={source}
          mlxOnly={mlxOnly}
          toggleMlxOnly={toggleMlxOnly}
        />
      ))}
    </List>
  );
}

function ModelListItem({
  model,
  config,
  source,
  mlxOnly,
  toggleMlxOnly,
}: {
  model: HfSearchResult;
  config: (typeof SOURCE_CONFIG)[Source];
  source: Source;
  mlxOnly: boolean;
  toggleMlxOnly: () => void;
}) {
  return (
    <List.Item
      title={model.repo_id}
      keywords={[model.repo_id, model.params_formatted]}
      accessories={[
        ...(model.params_formatted ? [{ tag: model.params_formatted }] : []),
        ...(model.size_formatted ? [{ tag: model.size_formatted }] : []),
        {
          tag: {
            value: `${formatCount(model.downloads)} ↓`,
            color: Color.SecondaryText,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Download"
            icon={Icon.Download}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: `Starting download...`,
              });
              try {
                await config.download(model.repo_id);
                toast.style = Toast.Style.Success;
                toast.title = `Download started for ${model.repo_id}`;
                toast.message = "Open Manage Downloads to track progress";
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Download failed";
                toast.message =
                  error instanceof Error ? error.message : "Unknown error";
              }
            }}
          />
          <Action.OpenInBrowser
            title={config.browserTitle}
            url={config.browserUrl(model.repo_id)}
          />
          <Action.CopyToClipboard
            title="Copy Model Id"
            content={model.repo_id}
          />
          {source === "huggingface" && (
            <Action
              title={mlxOnly ? "Show All Models" : "Mlx Only"}
              icon={Icon.Filter}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={toggleMlxOnly}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
