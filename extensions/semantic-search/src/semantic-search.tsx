import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  LaunchProps,
  open,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
  environment,
} from "@raycast/api";

import { connectService } from "./service";
import { EngineSetup } from "./engine-setup";
import ModelSettings from "./model-settings";
import { createPreviewFiles } from "./preview-files";

type Result = {
  path: string;
  name: string;
  kind: "image" | "document" | "video" | "audio";
  score: number;
  snippet: string;
  thumbnail?: string;
  start_seconds?: number | null;
  end_seconds?: number | null;
  matched_modality?: "video" | "audio" | null;
  duration_seconds?: number | null;
};
type Kind = "all" | "image" | "document" | "video" | "audio";
type Status = {
  index_revision?: number;
  last_index_summary?: {
    finished_at: number;
    added: number;
    updated: number;
    deleted: number;
  };
  files: number;
  indexing: boolean;
  roots: string[];
  runtime?: { state: string };
  progress?: { processed: number; total: number };
};

const timecode = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60),
    hours = Math.floor(minutes / 60);
  return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function SemanticSearch(
  props: LaunchProps<{ arguments: { query?: string } }>,
) {
  const { push } = useNavigation();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const showLibrary = () => {
    setLibraryOpen(true);
    push(<ModelSettings onClose={() => setLibraryOpen(false)} />);
  };
  const [query, setQuery] = useState(props.arguments?.query || "");
  const [kind, setKind] = useState<Kind>("all");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>();
  const [selection, setSelection] = useState<string | null>(null);
  const [showPhotoDetails, setShowPhotoDetails] = useState(false);
  const [preview, setPreview] = useState<{
    path: string;
    start: number;
    image: string;
    pages: number;
  }>();
  const [previewError, setPreviewError] = useState("");
  const generation = useRef(0);
  const lastIndexRevision = useRef<number | undefined>(undefined);
  const lastIndexEnd = useRef<number | undefined>(undefined);
  const [indexVersion, setIndexVersion] = useState(0);
  const [baseURL, setBaseURL] = useState("");
  const [setupMessage, setSetupMessage] = useState("Preparing local search…");
  useEffect(() => {
    let active = true;
    setError("");
    void connectService((message) => {
      if (active) setSetupMessage(message);
    })
      .then((url) => {
        if (active) setBaseURL(url);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    if (!baseURL || libraryOpen) return;
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        await fetch(`${baseURL}/v1/session`, { method: "POST" });
        const response = await fetch(`${baseURL}/v1/status`);
        if (response.ok && active) {
          const data = (await response.json()) as Status;
          const revision = data.index_revision || 0;
          if (
            lastIndexRevision.current !== undefined &&
            revision !== lastIndexRevision.current
          )
            setIndexVersion((value) => value + 1);
          lastIndexRevision.current = revision;
          const finished = data.last_index_summary?.finished_at || 0;
          if (
            lastIndexEnd.current !== undefined &&
            finished !== lastIndexEnd.current &&
            data.last_index_summary &&
            (data.last_index_summary.added ||
              data.last_index_summary.updated ||
              data.last_index_summary.deleted)
          )
            setIndexVersion((value) => value + 1);
          lastIndexEnd.current = finished;
          // Session timestamps and diagnostic counters change on every poll.
          // Only update React state when something visible in Search changes.
          const visible: Status = {
            files: data.files,
            indexing: data.indexing,
            roots: data.roots,
            runtime: { state: data.runtime?.state || "" },
            progress: data.progress && {
              processed: data.progress.processed,
              total: data.progress.total,
            },
          };
          setStatus((previous) =>
            JSON.stringify(previous) === JSON.stringify(visible)
              ? previous
              : visible,
          );
        }
      } catch {
        /* Search itself displays connection errors. */
      } finally {
        pending = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [baseURL, libraryOpen]);

  const scope =
    status?.roots
      .map((root) => root.split("/").filter(Boolean).pop())
      .join(", ") || "Local Files";
  const progress =
    status?.indexing && status.progress
      ? `Indexing ${scope}: ${status.progress.processed} / ${status.progress.total}`
      : `${scope}${status ? ` · ${status.files} files` : ""}${status?.runtime?.state === "loading" ? " · Loading model…" : ""}`;

  const selected =
    results.find((result) => result.path === selection) || results[0];
  const pdfPath = selected?.path.toLowerCase().endsWith(".pdf")
    ? selected.path
    : undefined;
  const previewPath =
    selected?.kind === "image" || selected?.kind === "video"
      ? selected.path
      : pdfPath;
  const previewStart =
    selected?.kind === "video" ? selected.start_seconds || 0 : 0;
  const selectedThumbnail = selected?.thumbnail;
  useEffect(() => {
    let disposed = false;
    const frameTimers: ReturnType<typeof setTimeout>[] = [];
    setPreview(undefined);
    setPreviewError("");
    if (!baseURL || !previewPath) return;
    const files = createPreviewFiles(environment.supportPath);
    const thumbnailReady = selectedThumbnail
      ? files
          .then(async (cache) => {
            const image = await cache.write(selectedThumbnail);
            if (!disposed)
              setPreview({
                path: previewPath,
                start: previewStart,
                image,
                pages: 0,
              });
          })
          .catch(() => {
            /* A sharp preview can still succeed. */
          })
      : Promise.resolve();
    // Request the sharper preview only after keyboard navigation settles.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${baseURL}/v1/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: previewPath,
            animate: selected?.kind === "image",
            start_seconds: previewStart,
          }),
        });
        if (!response.ok) throw new Error("Preview unavailable");
        const data = (await response.json()) as {
          preview: string;
          pages: number;
          transition_frames?: string[];
          transition_ms?: number;
        };
        if (!disposed) {
          await thumbnailReady;
          const cache = await files;
          const frames = data.transition_frames?.length
            ? await Promise.all(
                data.transition_frames.map((image) => cache.write(image)),
              )
            : undefined;
          if (disposed) return;
          if (frames?.length) {
            // All frames remain JPEGs in the same native view, with fixed bounds.
            // Tinycast retains the previous inline image while decoding the next.
            const step = (data.transition_ms || 240) / frames.length;
            frames.forEach((image, index) =>
              frameTimers.push(
                setTimeout(
                  () => {
                    if (!disposed)
                      setPreview({
                        path: previewPath,
                        start: previewStart,
                        image,
                        pages: data.pages,
                      });
                  },
                  step * (index + 1),
                ),
              ),
            );
          } else {
            const image = await cache.write(data.preview);
            if (!disposed)
              setPreview({
                path: previewPath,
                start: previewStart,
                image,
                pages: data.pages,
              });
          }
        }
      } catch {
        if (!disposed) setPreviewError(previewPath);
      }
    }, 120);
    return () => {
      disposed = true;
      clearTimeout(timer);
      frameTimers.forEach(clearTimeout);
      void files
        .then((cache) => cache.close())
        .catch(() => {
          /* Expire an interrupted host session next time. */
        });
    };
  }, [previewPath, previewStart, baseURL, selectedThumbnail]);

  const detailMarkdown = (result: Result) => {
    if (result.kind === "image" || result.kind === "video") {
      const image =
        preview?.path === result.path &&
        preview.start ===
          (result.kind === "video" ? result.start_seconds || 0 : 0)
          ? preview.image
          : undefined;
      // Allow the pane's entire width, keeping portraits within its visible height.
      // Reserve space for metadata only when explicitly expanded. The thumbnail
      // and every refinement frame share these bounds to avoid layout jumps.
      const height = showPhotoDetails
        ? 260
        : result.kind === "video"
          ? 340
          : 380;
      const match =
        result.kind === "video" &&
        result.start_seconds != null &&
        result.end_seconds != null
          ? `\n\n**${result.matched_modality === "audio" ? "Audio" : "Scene"} ${timecode(result.start_seconds)}–${timecode(result.end_seconds)}** · Open Matched Segment in Actions`
          : "";
      return (
        (image
          ? `![Preview](${image}?raycast-width=1024&raycast-height=${height})`
          : previewError === result.path
            ? "Preview unavailable. Use Open File to view the image."
            : "Loading image preview…") + match
      );
    }
    if (result.kind === "audio")
      return `**Audio match ${timecode(result.start_seconds || 0)}–${timecode(result.end_seconds || 0)}**\n\nRecording length: ${timecode(result.duration_seconds || 0)}\n\nUse Open Matched Segment to listen to this fragment, or Open File for the full recording.`;
    if (result.path === pdfPath && preview?.path === result.path)
      return `![PDF page](${preview.image})\n\nPage 1 of ${preview.pages}`;
    if (result.path === pdfPath && previewError !== result.path)
      return "Loading PDF preview…";
    const text = result.snippet.replace(/[\\`*_{}[\]<>#]/g, "\\$&");
    return previewError === result.path
      ? `PDF preview unavailable. Use Open File to view the document.\n\n${text}`
      : text;
  };

  const openSegment = async (result: Result) => {
    if (result.start_seconds == null || result.end_seconds == null) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing matched segment…",
    });
    try {
      const response = await fetch(`${baseURL}/v1/segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: result.path,
          start_seconds: result.start_seconds,
          end_seconds: result.end_seconds,
        }),
      });
      const data = (await response.json()) as {
        path?: string;
        detail?: string;
      };
      if (!response.ok || !data.path)
        throw new Error(data.detail || "Segment unavailable");
      await open(data.path);
      toast.style = Toast.Style.Success;
      toast.title = "Matched segment opened";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not open segment";
      toast.message = String(e);
    }
  };

  useEffect(() => {
    if (!baseURL) return;
    const version = ++generation.current;
    const text = query.trim();
    setResults([]);
    setError("");
    if (!baseURL || !text) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let disposed = false;
    // Tinycast's aborted fetch still runs on the server. Debounce and ignore stale responses.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${baseURL}/v1/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, kind, limit: 30 }),
        });
        if (!response.ok) {
          const failure = (await response.json()) as { detail?: string };
          throw new Error(failure.detail || "Search failed");
        }
        const data = (await response.json()) as { results: Result[] };
        if (!disposed && generation.current === version)
          setResults(data.results);
      } catch (err) {
        if (!disposed && generation.current === version) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!disposed && generation.current === version) setLoading(false);
      }
    }, 350);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [query, kind, baseURL, indexVersion]);

  const updateIndex = async () => {
    if (!baseURL || status?.indexing) return;
    try {
      const response = await fetch(`${baseURL}/v1/index/start`, {
        method: "POST",
      });
      if (!response.ok)
        throw new Error(
          ((await response.json()) as { detail?: string }).detail ||
            "Could not update the index",
        );
      await showToast({
        style: Toast.Style.Success,
        title: "Updating search index",
        message:
          "New and changed files are indexed. Results refresh after the scan.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Index update failed",
        message: String(e),
      });
    }
  };

  if (!baseURL)
    return (
      <EngineSetup
        message={error || setupMessage}
        failed={!!error}
        retry={() => setRetry((value) => value + 1)}
      />
    );
  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      isLoading={
        (!baseURL && !error) || loading || status?.runtime?.state === "loading"
      }
      onSelectionChange={setSelection}
      isShowingDetail={results.length > 0}
      searchBarPlaceholder="Describe a file, scene or sound…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="File type"
          value={kind}
          onChange={(value) => setKind(value as Kind)}
        >
          <List.Dropdown.Item title="All Files" value="all" />
          <List.Dropdown.Item title="Documents" value="document" />
          <List.Dropdown.Item title="Images" value="image" />
          <List.Dropdown.Item title="Videos" value="video" />
          <List.Dropdown.Item title="Audio" value="audio" />
        </List.Dropdown>
      }
    >
      {!baseURL && !error && (
        <List.Item
          title={setupMessage}
          subtitle="The local engine is prepared automatically on first launch."
          icon={Icon.Download}
        />
      )}
      <List.Section
        title={progress}
        subtitle={
          status?.indexing ? `${status.files} files searchable` : undefined
        }
      >
        {results.map((result) => (
          <List.Item
            key={result.path}
            id={result.path}
            title={result.name}
            subtitle={result.path.slice(0, result.path.lastIndexOf("/"))}
            icon={
              result.kind === "image" || result.kind === "video"
                ? {
                    source:
                      result.thumbnail ||
                      (result.kind === "image" ? result.path : Icon.Video),
                  }
                : result.kind === "audio"
                  ? Icon.Music
                  : Icon.Document
            }
            accessories={
              result.start_seconds != null
                ? [{ text: timecode(result.start_seconds) }]
                : undefined
            }
            detail={
              <List.Item.Detail
                markdown={detailMarkdown(result)}
                metadata={
                  (result.kind === "image" || result.kind === "video") &&
                  !showPhotoDetails ? undefined : (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="File"
                        text={result.name}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Location"
                        text={result.path}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Matched by"
                        text={
                          result.kind === "image"
                            ? "Visual content"
                            : result.kind === "document"
                              ? "Document content"
                              : result.matched_modality === "audio"
                                ? "Audio content"
                                : "Video scene"
                        }
                      />
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open title="Open File" target={result.path} />
                {(result.kind === "video" || result.kind === "audio") && (
                  <Action
                    title="Open Matched Segment"
                    icon={Icon.Play}
                    onAction={() => openSegment(result)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                )}
                <Action.ShowInFinder path={result.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={result.path}
                />
                {(result.kind === "image" || result.kind === "video") && (
                  <Action
                    title={
                      showPhotoDetails
                        ? "Hide File Details"
                        : "Show File Details"
                    }
                    icon={Icon.Info}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => setShowPhotoDetails((visible) => !visible)}
                  />
                )}
                <Action
                  title="Update Search Index"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={updateIndex}
                />
                <Action
                  title="Manage Library"
                  icon={Icon.Gear}
                  onAction={showLibrary}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        title={
          error
            ? "Search Needs Attention"
            : !baseURL
              ? "Setting Up Semantic Search"
              : status?.roots.length === 0
                ? "Choose Your Folders"
                : loading
                  ? "Searching…"
                  : query.trim()
                    ? "No Results"
                    : "Describe What You Remember"
        }
        description={
          error
            ? error
            : !baseURL
              ? setupMessage
              : status?.roots.length === 0
                ? "Open Model Settings, add folders and download the recommended model."
                : status?.indexing
                  ? `${progress}. ${status.files} files are already searchable.`
                  : status?.runtime?.state === "loading"
                    ? "Loading the local model…"
                    : "Find documents, photographs, video scenes and audio by meaning. Enable content types in Manage Library."
        }
        actions={
          <ActionPanel>
            <Action
              title="Manage Library"
              icon={Icon.Gear}
              onAction={showLibrary}
            />
            <Action
              title="Update Search Index"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={updateIndex}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
