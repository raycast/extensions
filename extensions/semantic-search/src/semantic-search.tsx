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
  source?: "file" | "photos";
  open_target?: string;
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
  photos_library?: { enabled: boolean; indexed: number };
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
  props: LaunchProps<{ arguments: Arguments.SemanticSearch }>,
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
  const [preview, setPreview] = useState<{
    path: string;
    start: number;
    image: string;
    pages: number;
  }>();
  const [previewError, setPreviewError] = useState("");
  const [photoDate, setPhotoDate] = useState<{
    path: string;
    created_at: number | null;
  }>();
  const photoDates = useRef(new Map<string, number | null>());
  const copyingPhoto = useRef(false);
  const generation = useRef(0);
  const lastIndexRevision = useRef<number | undefined>(undefined);
  const lastIndexEnd = useRef<number | undefined>(undefined);
  const [indexVersion, setIndexVersion] = useState(0);
  const [baseURL, setBaseURL] = useState("");
  const [setupMessage, setSetupMessage] = useState(
    "Connecting to local search…",
  );
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
            photos_library: data.photos_library && {
              enabled: data.photos_library.enabled,
              indexed: data.photos_library.indexed,
            },
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
    [
      ...(status?.roots.map((root) => root.split("/").filter(Boolean).pop()) ||
        []),
      ...(status?.photos_library?.enabled ? ["Apple Photos"] : []),
    ].join(", ") || "Local Files";
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

  const requestPhoto = async (action: "details" | "copy", path: string) => {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${baseURL}/v1/photos/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (response.status === 409 && attempt < 40) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      const data = (await response.json()) as {
        detail?: string;
        copied?: boolean;
        width?: number;
        height?: number;
        created_at?: number | null;
      };
      if (!response.ok)
        throw new Error(data.detail || "Photos operation failed");
      return data;
    }
  };
  useEffect(() => {
    photoDates.current.clear();
    setPhotoDate(undefined);
  }, [indexVersion]);
  useEffect(() => {
    if (!baseURL || selected?.source !== "photos") return;
    const path = selected.path;
    if (photoDates.current.has(path)) {
      setPhotoDate({ path, created_at: photoDates.current.get(path)! });
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      void requestPhoto("details", path)
        .then((data) => {
          if (!active) return;
          const created_at = data.created_at ?? null;
          photoDates.current.set(path, created_at);
          setPhotoDate({ path, created_at });
        })
        .catch(() => {
          /* Searching remains usable without Photos metadata. */
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [baseURL, selected?.path, selected?.source, indexVersion]);

  const copyPhoto = async (result: Result) => {
    if (copyingPhoto.current) return;
    copyingPhoto.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Copying full-resolution photo…",
    });
    try {
      const data = await requestPhoto("copy", result.path);
      if (!data.copied) throw new Error("The photo could not be copied");
      toast.style = Toast.Style.Success;
      toast.title = "Photo copied";
      toast.message = `${data.width} × ${data.height} pixels · Ready to paste`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not copy photo";
      toast.message = String(e);
    } finally {
      copyingPhoto.current = false;
    }
  };

  const detailMarkdown = (result: Result) => {
    if (result.kind === "image" || result.kind === "video") {
      const image =
        preview?.path === result.path &&
        preview.start ===
          (result.kind === "video" ? result.start_seconds || 0 : 0)
          ? preview.image
          : undefined;
      // Details scroll below the image rather than reserving preview space.
      // Every refinement frame keeps the same bounds to avoid layout jumps.
      const height = result.kind === "video" ? 340 : 380;
      const escapeText = (text: string) =>
        text.replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
      const date =
        photoDate?.path === result.path && photoDate.created_at != null
          ? `\n\n**Date taken:** ${new Date(photoDate.created_at * 1000).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
          : "";
      const details = `\n\n---\n\n**File:** ${escapeText(result.name)}\n\n**Location:** ${result.source === "photos" ? "Apple Photos Library" : escapeText(result.path)}${result.source === "photos" ? date : ""}\n\n**Matched by:** ${result.kind === "image" ? "Visual content" : result.matched_modality === "audio" ? "Audio content" : "Video scene"}`;
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
            : "Loading image preview…") +
        match +
        details
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
        audio_unavailable?: boolean;
      };
      if (!response.ok || !data.path)
        throw new Error(data.detail || "Segment unavailable");
      await open(data.path);
      toast.style = Toast.Style.Success;
      toast.title = "Matched segment opened";
      if (data.audio_unavailable)
        toast.message =
          "Opened without sound: the soundtrack could not be decoded.";
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

  if (!baseURL && error)
    return (
      <EngineSetup
        message={error || setupMessage}
        failed={true}
        retry={() => setRetry((value) => value + 1)}
      />
    );
  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      isLoading={
        (!baseURL && !!query.trim() && !error) ||
        loading ||
        status?.runtime?.state === "loading"
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
            subtitle={
              result.source === "photos"
                ? "Apple Photos"
                : result.path.slice(0, result.path.lastIndexOf("/"))
            }
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
                  result.kind === "image" ||
                  result.kind === "video" ? undefined : (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="File"
                        text={result.name}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Location"
                        text={
                          result.source === "photos"
                            ? "Apple Photos Library"
                            : result.path
                        }
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Matched by"
                        text={
                          result.kind === "document"
                            ? "Document content"
                            : "Audio content"
                        }
                      />
                    </List.Item.Detail.Metadata>
                  )
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Open
                  title={
                    result.source === "photos" ? "Open in Photos" : "Open File"
                  }
                  target={result.open_target || result.path}
                />
                {(result.kind === "video" || result.kind === "audio") && (
                  <Action
                    title="Open Matched Segment"
                    icon={Icon.Play}
                    onAction={() => openSegment(result)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                )}
                {result.source !== "photos" && (
                  <Action.ShowInFinder path={result.path} />
                )}
                {result.source === "photos" ? (
                  result.kind === "image" && (
                    <Action
                      title="Copy Photo"
                      icon={Icon.Clipboard}
                      onAction={() => copyPhoto(result)}
                    />
                  )
                ) : (
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={result.path}
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
            : status?.roots.length === 0 && !status.photos_library?.enabled
              ? "Choose Your Folders"
              : loading || (!baseURL && !!query.trim())
                ? "Searching…"
                : query.trim()
                  ? "No Results"
                  : "Describe What You Remember"
        }
        description={
          error
            ? error
            : !baseURL && !!query.trim()
              ? setupMessage
              : status?.roots.length === 0 && !status.photos_library?.enabled
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
