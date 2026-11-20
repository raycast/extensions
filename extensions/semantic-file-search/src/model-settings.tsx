import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";

import { connectService, engineFetch } from "./service";
import { getLauncherOwner } from "./launcher";
import { useAutomaticSettings } from "./automatic-settings";
import { AutomaticStatus } from "./automatic-client";
import { EngineSetup } from "./engine-setup";
import {
  addExclusionFolders,
  reconcileValues,
  sameSettingsValue,
  formatFolderPaths,
  parseFolderPaths,
  folderRequestPaths,
  SettingsPollGuard,
} from "./settings-values";

type Values = {
  roots: string[];
  model_variant: string;
  model_url: string;
  dimensions: string;
  enable_documents: boolean;
  enable_images: boolean;
  enable_video: boolean;
  enable_audio: boolean;
  enable_photos_library: boolean;
  photos_allow_network: boolean;
  video_segment_seconds: string;
  audio_segment_seconds: string;
  thumbnail_px: string;
  chunk_tokens: string;
  idle_seconds: string;
  excluded_paths: string[];
};
type ModelSource = {
  id: string;
  label: string;
  repo: string;
  revision: string;
  recommended?: boolean;
  experimental?: boolean;
  installed: boolean;
  disk_bytes: number;
  download_bytes: number;
  capabilities?: { images: boolean; video: boolean; audio: boolean };
};
type IndexStatus = {
  retained_files?: number;
  last_index_summary?: {
    added: number;
    updated: number;
    unchanged: number;
    deleted: number;
    errors: number;
    cached_skips?: number;
    retry_deferred?: number;
    audio_retries_deferred?: number;
    deferred_photos?: number;
    deferred_videos?: number;
    partial_videos?: number;
    finished_at?: number;
    cancelled?: boolean;
  };
  files: number;
  chunks: number;
  database_bytes?: number;
  photos_library?: {
    by_kind?: {
      kind: string;
      files: number;
      vectors: number;
      vector_bytes: number;
    }[];
  };
  indexing: boolean;
  progress?: {
    source?: string;
    download_fraction?: number;
    processed: number;
    total: number;
    errors: number;
    cached_skips?: number;
    retry_deferred?: number;
    current_chunks_done: number;
    current_chunks_total: number;
  };
};
type Settings = {
  automatic?: AutomaticStatus;
  folders?: { path: string; files: number }[];
  models: ModelSource[];
  storage_path: string;
  current: Record<string, string | number | boolean | string[]>;
  profiles?: Record<string, Record<string, string | number | boolean>>;
  job: {
    state: string;
    pausing?: boolean;
    error?: string;
    index_errors?: number;
    exclusion_cleanup_pending?: number;
    folder_cleanup_pending?: number;
    excluded_files_removed?: number;
    report_path?: string;
    freed_bytes?: number;
  };
  video_supported: boolean;
  media_decoder_available: boolean;
  storage_by_kind?: {
    kind: string;
    files: number;
    vectors: number;
    vector_bytes: number;
  }[];
};

export default function ModelSettings({
  onClose,
}: { onClose?: () => void } = {}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => () => closeRef.current?.(), []);
  const [retry, setRetry] = useState(0);
  const [baseURL, setBaseURL] = useState("");
  const [setupMessage, setSetupMessage] = useState(
    "Connecting to local search…",
  );
  const [settings, setSettings] = useState<Settings>();
  const activationAllowed = useRef(true);
  const automatic = useAutomaticSettings(
    baseURL,
    settings?.automatic,
    (job) =>
      setSettings((previous) => (previous ? { ...previous, job } : previous)),
    () => activationAllowed.current,
  );
  const [indexStatus, setIndexStatus] = useState<IndexStatus>();
  const [error, setError] = useState("");
  const [values, setValues] = useState<Values>();
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const [customModel, setCustomModel] = useState<ModelSource>();
  const [modelError, setModelError] = useState("");
  const [checkingModel, setCheckingModel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editExclusionPaths, setEditExclusionPaths] = useState(false);
  const submittedValues = useRef<Values | undefined>(undefined);
  const editVersions = useRef<Partial<Record<keyof Values, number>>>({});
  const submittedEditVersions = useRef<Partial<Record<keyof Values, number>>>(
    {},
  );
  const markEdited = (...keys: (keyof Values)[]) => {
    for (const key of keys)
      editVersions.current[key] = (editVersions.current[key] || 0) + 1;
  };
  const serverValues = useRef<Values | undefined>(undefined);
  const pollGuard = useRef(new SettingsPollGuard());
  const [applyingSettings, setApplyingSettings] = useState(false);
  const [exclusionText, setExclusionText] = useState("");
  const [exclusionError, setExclusionError] = useState("");
  const [photosMessage, setPhotosMessage] = useState("");
  const [connectingPhotos, setConnectingPhotos] = useState(false);
  const [folderRemoval, setFolderRemoval] = useState({
    path: "",
    deleteSaved: false,
  });
  const folderToRemove = folderRemoval.path;
  const deleteFolderIndex = folderRemoval.deleteSaved;
  const [savingFolders, setSavingFolders] = useState(false);
  const addedFolders = useRef<string[]>([]);
  const submittedFolders = useRef<string[]>([]);
  const excludedPaths = values?.excluded_paths;
  useEffect(() => {
    if (!excludedPaths || exclusionError) return;
    try {
      // Keep equivalent user formatting, but reflect accepted server changes.
      if (sameSettingsValue(parseFolderPaths(exclusionText), excludedPaths))
        return;
    } catch {
      // An unfinished manual draft must survive background polling.
      return;
    }
    setExclusionText(formatFolderPaths(excludedPaths));
  }, [excludedPaths, exclusionText, exclusionError]);
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
    if (!baseURL) return;
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending || pollGuard.current.pending) return;
      pending = true;
      const revision = pollGuard.current.revision;
      try {
        const [response, statusResponse] = await Promise.all([
          engineFetch(`${baseURL}/v1/settings`),
          engineFetch(`${baseURL}/v1/status`),
        ]);
        if (!response.ok || !statusResponse.ok)
          throw new Error(
            `Service returned ${!response.ok ? response.status : statusResponse.status}`,
          );
        const data = (await response.json()) as Settings;
        const status = (await statusResponse.json()) as IndexStatus;
        if (active && pollGuard.current.accepts(revision)) {
          setSettings(data);
          setIndexStatus(status);
          setError("");
          const normalized = Object.fromEntries(
            Object.entries(data.current).map(([k, v]) => [
              k,
              Array.isArray(v)
                ? [...v]
                : typeof v === "boolean"
                  ? v
                  : String(v),
            ]),
          ) as Values;
          const pendingSubmission = submittedValues.current;
          const newerEdits = new Set(
            (Object.keys(editVersions.current) as (keyof Values)[]).filter(
              (key) =>
                editVersions.current[key] !==
                submittedEditVersions.current[key],
            ),
          );
          const submission =
            data.job.state === "complete" ? pendingSubmission : undefined;
          if (submission) {
            addedFolders.current = addedFolders.current.filter(
              (path) => !submittedFolders.current.includes(path),
            );
            submittedFolders.current = [];
          }
          if (["complete", "error"].includes(data.job.state))
            submittedValues.current = undefined;
          const priorServer = serverValues.current;
          serverValues.current = normalized;
          setValues((previous) => ({
            ...reconcileValues(
              previous,
              priorServer,
              normalized,
              pendingSubmission
                ? { edited: newerEdits, complete: !!submission }
                : undefined,
            ),
            roots: addExclusionFolders(normalized.roots, addedFolders.current),
          }));
        }
      } catch (e) {
        if (active && pollGuard.current.accepts(revision)) setError(String(e));
      } finally {
        pending = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [baseURL, retry]);
  useEffect(() => {
    setCustomModel(undefined);
    setModelError("");
    if (
      !baseURL ||
      values?.model_variant !== "custom" ||
      !values.model_url.trim()
    ) {
      setCheckingModel(false);
      return;
    }
    const controller = new AbortController();
    setCheckingModel(true);
    const timer = setTimeout(async () => {
      try {
        const response = await engineFetch(`${baseURL}/v1/models/inspect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_variant: "custom",
            model_url: values.model_url.trim(),
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unsupported model");
        if (!controller.signal.aborted) {
          const model = data as ModelSource;
          setCustomModel(model);
          if (model.capabilities) {
            const draft = valuesRef.current;
            for (const [key, capability] of [
              ["enable_images", "images"],
              ["enable_video", "video"],
              ["enable_audio", "audio"],
            ] as const)
              if (draft?.[key] && !model.capabilities[capability])
                markEdited(key);
            setValues((previous) =>
              previous
                ? {
                    ...previous,
                    enable_images:
                      previous.enable_images && model.capabilities!.images,
                    enable_video:
                      previous.enable_video && model.capabilities!.video,
                    enable_audio:
                      previous.enable_audio && model.capabilities!.audio,
                  }
                : previous,
            );
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) setModelError(String(e));
      } finally {
        if (!controller.signal.aborted) setCheckingModel(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [baseURL, values?.model_variant, values?.model_url, settings?.job.state]);
  const [savingExclusions, setSavingExclusions] = useState(false);
  const busy =
    applyingSettings ||
    !!indexStatus?.indexing ||
    ["downloading", "applying", "indexing", "cancelling"].includes(
      settings?.job.state || "",
    );
  const selectedModel =
    values?.model_variant === "custom"
      ? customModel
      : settings?.models.find((m) => m.id === values?.model_variant);
  const normalizedCurrent = (key: string) => {
    const current = settings?.current[key];
    return Array.isArray(current)
      ? current
      : typeof current === "boolean"
        ? current
        : String(current ?? "");
  };
  const dirty =
    !!values &&
    !!settings &&
    Object.entries(values).some(
      ([key, value]) =>
        !(key === "model_url" && values.model_variant !== "custom") &&
        !sameSettingsValue(value, normalizedCurrent(key)),
    );
  const exclusionsDirty =
    !!values &&
    !!settings &&
    !sameSettingsValue(
      values.excluded_paths,
      settings.current.excluded_paths || [],
    );
  const onlyExclusionsDirty =
    !!dirty &&
    Object.entries(values || {}).every(
      ([key, value]) =>
        key === "excluded_paths" ||
        (key === "model_url" && values?.model_variant !== "custom") ||
        sameSettingsValue(value, normalizedCurrent(key)),
    );
  const onlyFoldersDirty =
    !!dirty &&
    Object.entries(values || {}).every(
      ([key, value]) =>
        key === "roots" ||
        (key === "model_url" && values?.model_variant !== "custom") ||
        sameSettingsValue(value, normalizedCurrent(key)),
    );
  activationAllowed.current = !dirty && !folderToRemove && !exclusionError;
  const applyTitle = applyingSettings
    ? "Applying Settings…"
    : savingFolders
      ? "Saving Folders…"
      : folderToRemove
        ? deleteFolderIndex
          ? "Remove Folder & Delete Index"
          : "Remove Search Folder"
        : onlyFoldersDirty && selectedModel?.installed
          ? "Save Search Folders"
          : busy && !exclusionsDirty
            ? "Indexing — Cancel in Actions"
            : busy && exclusionsDirty
              ? "Save Excluded Folders"
              : !values?.roots.length && !values?.enable_photos_library
                ? "Choose Folders First"
                : selectedModel?.installed
                  ? dirty
                    ? "Apply"
                    : "Update Search Index"
                  : "Download & Apply";
  const progress = indexStatus?.progress;
  const contentCounts =
    settings?.storage_by_kind &&
    [
      ["document", "Documents"],
      ["image", "Photos"],
      ["video", "Video"],
      ["audio", "Audio"],
    ]
      .map(
        ([kind, label]) =>
          `${label}: ${(settings.storage_by_kind?.find((row) => row.kind === kind)?.files ?? 0).toLocaleString()}`,
      )
      .join(" · ");
  const lastScan = indexStatus?.last_index_summary;
  const changesSummary = lastScan
    ? [
        lastScan.added && `${lastScan.added} new`,
        lastScan.updated && `${lastScan.updated} changed`,
        lastScan.deleted && `${lastScan.deleted} removed`,
        lastScan.cached_skips &&
          `${lastScan.cached_skips} skipped without retry`,
        lastScan.retry_deferred &&
          `${lastScan.retry_deferred} waiting to retry`,
        lastScan.audio_retries_deferred &&
          `${lastScan.audio_retries_deferred} audio retries postponed`,
        lastScan.deferred_photos &&
          `${lastScan.deferred_photos} iCloud photos deferred`,
        lastScan.deferred_videos &&
          `${lastScan.deferred_videos} iCloud videos deferred`,
      ]
        .filter(Boolean)
        .join(" · ") || "no changes"
    : "";
  const scanSummary = indexStatus?.indexing
    ? progress && progress.total
      ? `Indexing: ${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()} checked (${Math.floor((progress.processed / progress.total) * 100)}%). ${Math.max(0, progress.total - progress.processed).toLocaleString()} remaining.${progress.errors ? ` ${progress.errors} issues.` : ""}${progress.cached_skips ? ` ${progress.cached_skips} skipped without retry.` : ""}${progress.retry_deferred ? ` ${progress.retry_deferred} waiting to retry.` : ""}${progress.current_chunks_total ? `\nCurrent file: ${progress.current_chunks_done} / ${progress.current_chunks_total} segments.` : ""}`
      : "Indexing: discovering files…"
    : lastScan
      ? `Last ${lastScan.cancelled ? "update cancelled" : "update"}${lastScan.finished_at ? `: ${new Date(lastScan.finished_at * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""} · ${changesSummary}${lastScan.errors > (lastScan.partial_videos || 0) ? ` · ${lastScan.errors - (lastScan.partial_videos || 0)} skipped${settings?.job.report_path ? " (report in Actions)" : ""}` : ""}${lastScan.partial_videos ? ` · ${lastScan.partial_videos} videos with incomplete audio` : ""}`
      : "Choose folders, then update the search index (⌘R).";
  const indexOverview = `${(indexStatus?.files ?? 0).toLocaleString()} files · ${(indexStatus?.chunks ?? 0).toLocaleString()} vectors${indexStatus?.database_bytes !== undefined ? ` · ${(indexStatus.database_bytes / 1e6).toFixed(1)} MB on disk` : ""}\n${contentCounts || ""}\n${scanSummary}`;
  const operationMessage = applyingSettings
    ? "Applying settings…"
    : settings?.job.state === "cancelling"
      ? "Stopping after the current operation… Completed files are preserved."
      : busy && dirty && !exclusionsDirty
        ? "Indexing is running. Cancel in Actions (⌘.) or wait before applying model changes."
        : error ||
          settings?.job.error ||
          (["downloading", "applying"].includes(settings?.job.state || "")
            ? `${settings?.job.state === "downloading" ? "Downloading model" : "Applying settings"}…`
            : settings?.job.state === "deleted"
              ? "Model deleted. Your index is preserved. Download the model again to search."
              : settings?.job.state === "downloaded"
                ? "Model downloaded. Apply your settings when ready."
                : "");
  const update = (key: keyof Values, value: string | boolean | string[]) => {
    markEdited(key);
    setValues((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  };
  const connectPhotos = async () => {
    if (connectingPhotos) return;
    setConnectingPhotos(true);
    setPhotosMessage("Waiting for macOS Photos access…");
    try {
      const response = await engineFetch(`${baseURL}/v1/photos/connect`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not connect Photos");
      if (!["authorized", "limited"].includes(data.authorization))
        throw new Error(
          "Allow Photos access in macOS Privacy & Security settings.",
        );
      setPhotosMessage(
        `${Number(data.photos).toLocaleString()} photos · ${Number(data.videos || 0).toLocaleString()} videos available. Apply, then Update Search Index to import enabled content.`,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Apple Photos connected",
      });
    } catch (e) {
      setPhotosMessage(String(e));
      await showToast({
        style: Toast.Style.Failure,
        title: "Photos connection failed",
        message: String(e),
      });
    } finally {
      setConnectingPhotos(false);
    }
  };
  const downloadModel = async (variant = values?.model_variant) => {
    if (!variant || busy) return;
    try {
      const response = await engineFetch(`${baseURL}/v1/models/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_variant: variant,
          model_url: variant === "custom" ? values?.model_url.trim() : "",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not download model");
      setSettings((previous) =>
        previous ? { ...previous, job: data } : previous,
      );
      await showToast({
        style: Toast.Style.Success,
        title:
          data.state === "downloaded"
            ? "Model downloaded"
            : "Model download started",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model download failed",
        message: String(e),
      });
    }
  };
  const selectModel = (variant: string) => {
    const saved = settings?.profiles?.[variant];
    markEdited(
      "model_variant",
      "chunk_tokens",
      "audio_segment_seconds",
      ...(Object.keys(saved || {}).filter(
        (key) => values && key in values,
      ) as (keyof Values)[]),
    );
    setValues((previous) => {
      if (!previous) return previous;
      const next = { ...previous, model_variant: variant };
      if (saved)
        for (const [key, value] of Object.entries(saved)) {
          if (key in next)
            (next as Record<string, string | boolean | string[]>)[key] =
              typeof value === "boolean" ? value : String(value);
        }
      if (variant === "coreml-experimental") {
        next.chunk_tokens = String(Math.min(Number(next.chunk_tokens), 480));
        next.audio_segment_seconds = String(
          Math.min(Number(next.audio_segment_seconds), 10),
        );
      } else if (next.chunk_tokens === "480") next.chunk_tokens = "512";
      return next;
    });
  };
  const cancelIndex = async () => {
    try {
      const response = await engineFetch(`${baseURL}/v1/index/cancel`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not cancel indexing");
      setSettings((previous) =>
        previous ? { ...previous, job: data } : previous,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Stopping indexing",
        message:
          "Stops after the current operation. Completed files remain indexed.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not cancel indexing",
        message: String(e),
      });
    }
  };
  const deleteModel = async () => {
    if (!values || busy || !selectedModel?.installed) return;
    try {
      const response = await engineFetch(`${baseURL}/v1/models/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_variant: values.model_variant,
          model_url:
            values.model_variant === "custom" ? values.model_url.trim() : "",
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not delete model");
      setSettings((previous) =>
        previous
          ? {
              ...previous,
              job: data,
              models: previous.models.map((m) =>
                m.id === selectedModel.id
                  ? { ...m, installed: false, disk_bytes: 0 }
                  : m,
              ),
            }
          : previous,
      );
      setCustomModel((previous) =>
        previous ? { ...previous, installed: false, disk_bytes: 0 } : previous,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Model deleted",
        message: `${((data.freed_bytes || 0) / 1e9).toFixed(2)} GB freed. Indexes are preserved.`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model deletion failed",
        message: String(e),
      });
    }
  };
  const acceptFolders = (
    roots: string[],
    savedAdditions: string[] = [],
    removed?: string,
  ) => {
    addedFolders.current = addedFolders.current.filter(
      (path) => !savedAdditions.includes(path) && path !== removed,
    );
    if (serverValues.current)
      serverValues.current = { ...serverValues.current, roots };
    setSettings((previous) =>
      previous
        ? {
            ...previous,
            current: { ...previous.current, roots },
          }
        : previous,
    );
    setValues((previous) =>
      previous
        ? {
            ...previous,
            roots: addExclusionFolders(roots, addedFolders.current),
          }
        : previous,
    );
  };
  const saveFolders = async () => {
    if (!values || pollGuard.current.pending) return;
    const submitted = [...addedFolders.current];
    if (!submitted.length) return;
    pollGuard.current.begin();
    setSavingFolders(true);
    try {
      const response = await engineFetch(`${baseURL}/v1/folders/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: folderRequestPaths(submitted) }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not save search folders");
      acceptFolders(data.roots, submitted);
      await showToast({
        style: Toast.Style.Success,
        title: "Search folders saved",
        message:
          "Existing entries are preserved. Run Update Search Index to check new folders.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save search folders",
        message: String(e),
      });
    } finally {
      pollGuard.current.end();
      setSavingFolders(false);
    }
  };
  const removeFolder = async () => {
    if (!values || !folderToRemove || pollGuard.current.pending) return;
    const path = folderToRemove;
    const saved = (settings?.current.roots as string[])?.includes(path);
    if (!saved) {
      if (submittedValues.current?.roots.includes(path)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "This folder is being applied",
          message:
            "Wait for model setup to apply this folder, then remove it. Your removal has not been applied.",
        });
        return;
      }
      markEdited("roots");
      addedFolders.current = addedFolders.current.filter(
        (root) => root !== path,
      );
      setValues((previous) =>
        previous
          ? {
              ...previous,
              roots: previous.roots.filter((root) => root !== path),
            }
          : previous,
      );
      setFolderRemoval({ path: "", deleteSaved: false });
      return;
    }
    pollGuard.current.begin();
    setSavingFolders(true);
    try {
      const response = await engineFetch(`${baseURL}/v1/folders/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: folderRequestPaths([path])[0],
          delete_saved_index: deleteFolderIndex,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not remove search folder");
      acceptFolders(data.roots, [], path);
      setSettings((previous) =>
        previous
          ? {
              ...previous,
              job: {
                ...previous.job,
                folder_cleanup_pending: data.cleanup_pending,
              },
            }
          : previous,
      );
      setFolderRemoval((previous) =>
        previous.path === path ? { path: "", deleteSaved: false } : previous,
      );
      await showToast({
        style: data.cleanup_pending ? Toast.Style.Failure : Toast.Style.Success,
        title: "Search folder removed",
        message: deleteFolderIndex
          ? `${data.deleted_entries} saved entries deleted.${data.cleanup_pending ? " Some saved indexes need Retry Folder Cleanup in Actions." : ""} Original files are preserved.`
          : "Source removed. Entries outside remaining search folders are kept for reuse and hidden from search.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove search folder",
        message: String(e),
      });
    } finally {
      pollGuard.current.end();
      setSavingFolders(false);
    }
  };
  const retryFolderCleanup = async () => {
    try {
      const response = await engineFetch(`${baseURL}/v1/folders/cleanup`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Could not clean saved folder entries");
      setSettings((previous) =>
        previous
          ? {
              ...previous,
              job: {
                ...previous.job,
                folder_cleanup_pending: data.cleanup_pending,
              },
            }
          : previous,
      );
      await showToast({
        style: data.cleanup_pending ? Toast.Style.Failure : Toast.Style.Success,
        title: data.cleanup_pending
          ? "Folder cleanup pending"
          : "Folder cleanup complete",
        message: `${data.deleted_entries} saved entries deleted. Original files are preserved.`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder cleanup failed",
        message: String(e),
      });
    }
  };
  const saveExclusions = async () => {
    if (!values || pollGuard.current.pending) return;
    const submitted = values.excluded_paths;
    const submittedVersion = editVersions.current.excluded_paths || 0;
    setSavingExclusions(true);
    pollGuard.current.begin();
    try {
      const response = await engineFetch(`${baseURL}/v1/exclusions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excluded_paths: folderRequestPaths(submitted),
        }),
      });
      const data = (await response.json()) as {
        detail?: string;
        excluded_paths: string[];
        excluded_files_removed: number;
        excluded_saved_entries_removed: number;
        cleanup_pending: number;
      };
      if (!response.ok)
        throw new Error(data.detail || "Could not save excluded folders");
      const noNewerEdit =
        (editVersions.current.excluded_paths || 0) === submittedVersion;
      if (noNewerEdit && submittedValues.current)
        submittedEditVersions.current.excluded_paths = submittedVersion;
      if (serverValues.current)
        serverValues.current = {
          ...serverValues.current,
          excluded_paths: data.excluded_paths,
        };
      setSettings((previous) =>
        previous
          ? {
              ...previous,
              current: {
                ...previous.current,
                excluded_paths: data.excluded_paths,
              },
              job: {
                ...previous.job,
                exclusion_cleanup_pending: data.cleanup_pending,
              },
            }
          : previous,
      );
      setValues((previous) =>
        previous &&
        noNewerEdit &&
        sameSettingsValue(previous.excluded_paths, submitted)
          ? { ...previous, excluded_paths: data.excluded_paths }
          : previous,
      );
      await showToast({
        style: data.cleanup_pending ? Toast.Style.Failure : Toast.Style.Success,
        title: "Excluded folders saved",
        message: `${data.excluded_files_removed + data.excluded_saved_entries_removed} indexed entries removed. ${busy ? "The running scan skips these folders." : "New files in these folders will be skipped."}${data.cleanup_pending ? ` Cleanup pending in ${data.cleanup_pending} saved index(es); use Retry Exclusion Cleanup in Actions.` : ""}${dirty && !onlyExclusionsDirty ? " Other edited settings are still unapplied." : ""}`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save excluded folders",
        message: String(e),
      });
    } finally {
      pollGuard.current.end();
      setSavingExclusions(false);
    }
  };
  const apply = async () => {
    if (!values) return;
    if (automatic.dirty) {
      await automatic.save();
      return;
    }
    if (pollGuard.current.pending) return;
    if (folderToRemove) {
      await removeFolder();
      return;
    }
    if (editExclusionPaths && exclusionError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check exclusion paths",
        message: exclusionError,
      });
      return;
    }
    if (onlyFoldersDirty && selectedModel?.installed) {
      await saveFolders();
      return;
    }
    if (exclusionsDirty && (busy || onlyExclusionsDirty)) {
      await saveExclusions();
      return;
    }
    if (busy) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Indexing or model setup is running",
        message:
          "Use Actions → Cancel Indexing, then switch models. Completed files are preserved. Exclusions can be saved now.",
      });
      return;
    }
    if (!values.roots.length && !values.enable_photos_library) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose folders first",
        message: "Select folders in Folders to Search.",
      });
      return;
    }
    if (checkingModel || !selectedModel) {
      await showToast({
        style: Toast.Style.Failure,
        title: checkingModel
          ? "Checking model compatibility"
          : "Choose a supported model",
        message: modelError || "Paste a compatible Hugging Face model URL.",
      });
      return;
    }
    if (!dirty && selectedModel.installed) {
      await indexFiles();
      return;
    }
    pollGuard.current.begin();
    setApplyingSettings(true);
    const pendingFolders = [...addedFolders.current];
    const editsAtSubmission = { ...editVersions.current };
    try {
      const launcher = await getLauncherOwner();
      const response = await engineFetch(`${baseURL}/v1/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launcher,
          ...values,
          roots: folderRequestPaths(values.roots),
          excluded_paths: folderRequestPaths(values.excluded_paths),
          dimensions: Number(values.dimensions),
          thumbnail_px: Number(values.thumbnail_px),
          chunk_tokens: Number(values.chunk_tokens),
          idle_seconds: Number(values.idle_seconds),
          video_segment_seconds: Number(values.video_segment_seconds),
          audio_segment_seconds: Number(values.audio_segment_seconds),
        }),
      });
      const data = (await response.json()) as {
        detail?: string;
        state: string;
      };
      if (!response.ok)
        throw new Error(data.detail || "Could not apply settings");
      submittedValues.current = values;
      submittedEditVersions.current = editsAtSubmission;
      submittedFolders.current = pendingFolders;
      setSettings((previous) =>
        previous ? { ...previous, job: data } : previous,
      );
      await showToast({
        style: Toast.Style.Success,
        title: selectedModel.installed
          ? "Applying settings"
          : "Model download started",
        message: "Progress appears in this window.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model setup failed",
        message: String(e),
      });
    } finally {
      pollGuard.current.end();
      setApplyingSettings(false);
    }
  };
  const indexFiles = async (retrySkipped = false) => {
    if (busy) return;
    if (dirty) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Apply changed settings first",
        message: "The scan uses your saved folders and settings.",
      });
      return;
    }
    try {
      const launcher = await getLauncherOwner();
      const response = await engineFetch(`${baseURL}/v1/index/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          launcher,
          ...(retrySkipped ? { retry_skipped: true } : {}),
        }),
      });
      if (!response.ok)
        throw new Error(
          ((await response.json()) as { detail?: string }).detail ||
            "Indexing failed",
        );
      await showToast({
        style: Toast.Style.Success,
        title: retrySkipped
          ? "Retrying skipped files"
          : "Updating search index",
        message: retrySkipped
          ? "Previously skipped files are checked again. Completed entries are preserved."
          : "New and changed files are indexed. Unchanged files are skipped.",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Indexing failed",
        message: String(e),
      });
    }
  };
  // Tinycast focuses a form only on mount, so its initial fields must already exist.
  if (!baseURL && error)
    return (
      <EngineSetup
        message={error || setupMessage}
        failed={true}
        retry={() => setRetry((value) => value + 1)}
      />
    );
  if (!settings || !values)
    return (
      <List isLoading={!error}>
        <List.Item
          title={error ? "Couldn’t Load Settings" : "Loading settings…"}
          subtitle={
            error ||
            (!baseURL && setupMessage !== "Connecting to local search…"
              ? setupMessage
              : undefined)
          }
          icon={error ? Icon.ExclamationMark : Icon.Gear}
          actions={
            error ? (
              <ActionPanel>
                <Action
                  title="Retry Loading Settings"
                  onAction={() => setRetry((value) => value + 1)}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      </List>
    );
  return (
    <Form
      isLoading={
        automatic.saving ||
        savingFolders ||
        savingExclusions ||
        applyingSettings ||
        ["downloading", "applying"].includes(settings.job.state)
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              automatic.dirty ? "Save Automatic Update Settings" : applyTitle
            }
            onSubmit={apply}
          />
          {indexStatus?.indexing && settings.job.state !== "cancelling" && (
            <Action
              title={
                settings.job.pausing ? "Pausing Indexing…" : "Pause Indexing"
              }
              onAction={() => automatic.control("pause")}
            />
          )}
          {!indexStatus?.indexing &&
            !settings.job.pausing &&
            (settings.job.state === "paused" || automatic.paused) && (
              <Action
                title="Resume Indexing"
                onAction={() => automatic.control("resume")}
              />
            )}
          {automatic.enabled && (
            <Action
              title="Activate Background Checks"
              onAction={automatic.activate}
            />
          )}
          {folderToRemove && (
            <Action
              title="Remove Selected Folder"
              style={deleteFolderIndex ? Action.Style.Destructive : undefined}
              onAction={removeFolder}
            />
          )}
          {!!settings.job.folder_cleanup_pending && (
            <Action
              title="Retry Folder Cleanup"
              onAction={retryFolderCleanup}
            />
          )}
          {(indexStatus?.indexing ||
            (automatic.paused && settings.automatic?.continuation_origin) ||
            ["indexing", "cancelling", "paused"].includes(
              settings.job.state,
            )) && (
            <Action
              title={
                settings.job.state === "cancelling"
                  ? "Stopping Indexing…"
                  : "Cancel Indexing"
              }
              onAction={cancelIndex}
              shortcut={Keyboard.Shortcut.Common.Pin}
            />
          )}
          {!!settings.job.exclusion_cleanup_pending && (
            <Action title="Retry Exclusion Cleanup" onAction={saveExclusions} />
          )}
          {selectedModel && !selectedModel.installed && (
            <Action
              title="Download Selected Model"
              onAction={() => void downloadModel()}
            />
          )}
          {selectedModel?.installed && (
            <Action
              title="Delete Selected Model"
              style={Action.Style.Destructive}
              onAction={deleteModel}
            />
          )}
          <Action
            title="Update Search Index"
            onAction={indexFiles}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action
            title="Retry Skipped Files"
            icon={Icon.ArrowClockwise}
            onAction={() => indexFiles(true)}
          />
          <Action
            title={
              connectingPhotos
                ? "Connecting Apple Photos…"
                : "Connect Apple Photos"
            }
            icon={Icon.Image}
            onAction={connectPhotos}
          />
          {settings.storage_path && (
            <Action.Open
              title="Open Shared Storage Folder"
              target={settings.storage_path}
            />
          )}
          {settings.job.report_path && (
            <Action.Open
              title="Open Indexing Report"
              target={settings.job.report_path}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Search index" text={indexOverview} />
      {indexStatus?.indexing && progress?.source === "photos" && (
        <Form.Description
          title="Apple Photos"
          text={`Importing the Photos library${progress.download_fraction ? ` · iCloud download ${Math.round(progress.download_fraction * 100)}%` : ""}. Cancel in Actions to stop; completed photos and videos are preserved.`}
        />
      )}
      {!!operationMessage && (
        <Form.Description title="Status" text={operationMessage} />
      )}
      {!!settings.job.exclusion_cleanup_pending && (
        <Form.Description
          title="Cleanup pending"
          text={`${settings.job.exclusion_cleanup_pending} older index(es) unavailable. Exclusions are saved. Actions → Retry Exclusion Cleanup.`}
        />
      )}
      <Form.Dropdown
        id="model_variant"
        title="Model"
        value={values.model_variant}
        onChange={selectModel}
      >
        {settings.models
          .filter((m) => m.recommended || m.id === "coreml-experimental")
          .map((m) => (
            <Form.Dropdown.Item
              key={m.id}
              value={m.id}
              title={`${m.label}${m.recommended ? " · Recommended" : ""}`}
            />
          ))}
        <Form.Dropdown.Item value="custom" title="Custom model URL" />
      </Form.Dropdown>
      <Form.Description
        text={
          values.model_variant === "coreml-experimental"
            ? "Core ML uses its own index and up to 512 input tokens. Visual and audio encoders download when those content types are enabled."
            : "Changing the model selects its own index. Previous indexes are preserved."
        }
      />
      {values.model_variant === "custom" && (
        <>
          <Form.TextField
            id="model_url"
            title="Hugging Face URL"
            placeholder="https://huggingface.co/owner/model"
            value={values.model_url}
            onChange={(v) => update("model_url", v)}
          />
          <Form.Description
            title="Supported models"
            text="EmbeddingGemma 2 in MLX format: BF16, affine 8-bit or 4-bit, group size 64, 768-dimensional output. Media needs the corresponding encoder. Chat LLMs, GGUF and PyTorch checkpoints are unsupported."
          />
        </>
      )}
      <Form.Description
        title="Download"
        text={
          modelError ||
          (checkingModel
            ? "Checking compatibility…"
            : selectedModel
              ? `${selectedModel.installed ? "✓ Downloaded" : "Not downloaded"} · ${((selectedModel.installed ? selectedModel.disk_bytes : selectedModel.download_bytes) / 1e9).toFixed(2)} GB${values.model_variant === "custom" ? `\n${selectedModel.repo} · revision ${selectedModel.revision.slice(0, 12)}` : ""}`
              : "Paste a supported model URL.")
        }
      />
      <Form.Description
        title="Folders to Search"
        text={
          values.roots.length
            ? values.roots
                .map((path) => {
                  const saved = settings.folders?.find(
                    (folder) => folder.path === path,
                  );
                  return `${path}${saved ? ` · ${saved.files.toLocaleString()} files` : ""}`;
                })
                .join("\n")
            : "None"
        }
      />
      <Form.FilePicker
        id="roots"
        title="Add Search Folders"
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={true}
        value={[]}
        onChange={(folders) => {
          markEdited("roots");
          setFolderRemoval({ path: "", deleteSaved: false });
          addedFolders.current = addExclusionFolders(
            addedFolders.current,
            folders.filter(
              (path) => !(settings.current.roots as string[])?.includes(path),
            ),
          );
          setValues((previous) =>
            previous
              ? {
                  ...previous,
                  roots: addExclusionFolders(previous.roots, folders),
                }
              : previous,
          );
        }}
      />
      {!!values.roots.length && (
        <Form.Dropdown
          id="folder_to_remove"
          title="Remove a Folder"
          value={folderToRemove}
          onChange={(path) => {
            setFolderRemoval({ path, deleteSaved: false });
          }}
        >
          <Form.Dropdown.Item value="" title="Choose a folder…" />
          {values.roots.map((path) => (
            <Form.Dropdown.Item key={path} value={path} title={path} />
          ))}
        </Form.Dropdown>
      )}
      {!!folderToRemove && (
        <>
          {(settings.current.roots as string[])?.includes(folderToRemove) && (
            <Form.Checkbox
              id="delete_folder_index"
              label="Delete this folder's saved index entries"
              value={deleteFolderIndex}
              onChange={(deleteSaved) =>
                setFolderRemoval((previous) => ({ ...previous, deleteSaved }))
              }
            />
          )}
          <Form.Description text="Use the removal action below. Saved entries are kept by default. Other selected folders still include their subfolders. Original files are never deleted." />
        </>
      )}
      {!!indexStatus?.retained_files && (
        <Form.Description
          title="Saved for reuse"
          text={`${indexStatus.retained_files.toLocaleString()} entries from removed folders are stored but not searchable.`}
        />
      )}
      <Form.FilePicker
        id="excluded_folders"
        title="Add excluded folders"
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={true}
        value={[]}
        onChange={(folders) => {
          const next = addExclusionFolders(values.excluded_paths, folders);
          update("excluded_paths", next);
          setExclusionText(formatFolderPaths(next));
          setExclusionError("");
        }}
      />
      <Form.Description
        title="Excluded folders"
        text={
          values.excluded_paths.length
            ? values.excluded_paths
                .map((path) => path.replace(/\/$/, "").split("/").pop() || "/")
                .join(" · ")
            : "None"
        }
      />
      <Form.Checkbox
        id="edit_exclusion_paths"
        label="Edit exclusion paths manually"
        value={editExclusionPaths}
        onChange={(enabled) => {
          setEditExclusionPaths(enabled);
          setExclusionText(formatFolderPaths(values.excluded_paths));
          setExclusionError("");
        }}
      />
      {editExclusionPaths && (
        <Form.TextArea
          id="excluded_paths"
          title="Exclusion paths"
          placeholder="~/Downloads/folder-to-exclude"
          value={exclusionText}
          info="One path per line, or a JSON array for names with line breaks or surrounding whitespace."
          error={exclusionError || undefined}
          onChange={(text) => {
            setExclusionText(text);
            try {
              update("excluded_paths", parseFolderPaths(text));
              setExclusionError("");
            } catch {
              setExclusionError(
                "Enter valid folder paths or a JSON array of paths.",
              );
            }
          }}
        />
      )}
      <Form.Description text="Choose folders to add; edit paths to remove. Apply exclusions during indexing — other folders continue. Original files are preserved." />
      <Form.Checkbox
        id="enable_photos_library"
        title="Apple Photos"
        label="Search photos and videos in the Photos library"
        value={values.enable_photos_library}
        onChange={(enabled) => {
          update("enable_photos_library", enabled);
          if (enabled) update("enable_images", true);
        }}
      />
      {values.enable_photos_library && (
        <>
          <Form.Checkbox
            id="photos_allow_network"
            label="Allow iCloud downloads for media missing on this Mac"
            value={values.photos_allow_network}
            onChange={(enabled) => update("photos_allow_network", enabled)}
          />
          <Form.Description
            title="Photos access"
            text={
              photosMessage ||
              "Connect Apple Photos in Actions, then Apply and Update Search Index. The content switches below also apply to Photos. Originals stay in Photos; iCloud videos may download in full into Apple's cache."
            }
          />
          {indexStatus?.photos_library?.by_kind?.length ? (
            <Form.Description
              title="Photos index"
              text={indexStatus.photos_library.by_kind
                .map(
                  (row) =>
                    `${row.files.toLocaleString()} ${row.kind === "video" ? "videos" : "photos"} · ${(row.vector_bytes / 1e6).toFixed(2)} MB of vectors`,
                )
                .join("\n")}
            />
          ) : null}
        </>
      )}
      <Form.Checkbox
        id="enable_documents"
        title="Content to index"
        label="Documents and text"
        value={values.enable_documents}
        onChange={(v) => update("enable_documents", v)}
      />
      <Form.Checkbox
        id="enable_images"
        label="Photographs and images"
        value={values.enable_images}
        onChange={(v) => update("enable_images", v)}
      />
      {values.model_variant !== "reference" &&
      settings.media_decoder_available ? (
        <>
          <Form.Checkbox
            id="enable_video"
            label="Video scenes"
            value={values.enable_video}
            onChange={(v) => update("enable_video", v)}
          />
          <Form.Checkbox
            id="enable_audio"
            label="Audio and video soundtracks"
            value={values.enable_audio}
            onChange={(v) => update("enable_audio", v)}
          />
        </>
      ) : (
        <Form.Description
          title="Media"
          text={
            values.model_variant === "reference"
              ? "Video and audio require an MLX model in this version."
              : "Media decoding is unavailable. Reinstall the packaged extension."
          }
        />
      )}
      {automatic.fields}
      <Form.Separator />
      <Form.Checkbox
        id="show_advanced"
        title="Advanced"
        label="Show advanced settings"
        value={showAdvanced}
        onChange={setShowAdvanced}
      />
      {showAdvanced && (
        <>
          <Form.Dropdown
            id="dimensions"
            title="Vector size"
            value={values.dimensions}
            onChange={(v) => update("dimensions", v)}
          >
            {[768, 512, 256, 128].map((d) => (
              <Form.Dropdown.Item
                key={d}
                value={String(d)}
                title={`${d} dimensions${d === 128 ? " · smallest index" : d === 768 ? " · full length" : d === 512 ? " · balanced" : ""}`}
              />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="chunk_tokens"
            title="Document chunks"
            value={values.chunk_tokens}
            onChange={(v) => update("chunk_tokens", v)}
          >
            {(values.model_variant === "coreml-experimental"
              ? [256, 384, 480]
              : [256, 384, 512]
            ).map((d) => (
              <Form.Dropdown.Item
                key={d}
                value={String(d)}
                title={`${d} tokens · overlap 64`}
              />
            ))}
          </Form.Dropdown>
          <Form.Description text="Changing the model, vector size or chunk size selects a separate index." />
          {values.enable_video && (
            <Form.Dropdown
              id="video_segment_seconds"
              title="Video segments"
              value={values.video_segment_seconds}
              onChange={(v) => update("video_segment_seconds", v)}
            >
              {[5, 10, 20, 30].map((d) => (
                <Form.Dropdown.Item
                  key={d}
                  value={String(d)}
                  title={`${d} seconds · 3 frames`}
                />
              ))}
            </Form.Dropdown>
          )}
          {values.enable_audio && (
            <Form.Dropdown
              id="audio_segment_seconds"
              title="Audio segments"
              value={values.audio_segment_seconds}
              onChange={(v) => update("audio_segment_seconds", v)}
            >
              {(values.model_variant === "coreml-experimental"
                ? [10]
                : [10, 20, 30]
              ).map((d) => (
                <Form.Dropdown.Item
                  key={d}
                  value={String(d)}
                  title={`${d} seconds · overlap 2 seconds`}
                />
              ))}
            </Form.Dropdown>
          )}
          {(values.enable_video || values.enable_audio) && (
            <Form.Description
              title="Vector storage"
              text={`${Number(values.dimensions) * 4} bytes per segment. Video: ${((Math.ceil(3600 / Number(values.video_segment_seconds)) * Number(values.dimensions) * 4) / 1e6).toFixed(2)} MB/hour; audio: ${((Math.ceil(3600 / (Number(values.audio_segment_seconds) - 2)) * Number(values.dimensions) * 4) / 1e6).toFixed(2)} MB/hour, plus metadata and previews.`}
            />
          )}
          <Form.Dropdown
            id="thumbnail_px"
            title="List thumbnails"
            value={values.thumbnail_px}
            onChange={(v) => update("thumbnail_px", v)}
          >
            {[128, 256, 384].map((d) => (
              <Form.Dropdown.Item
                key={d}
                value={String(d)}
                title={`${d} pixels`}
              />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="idle_seconds"
            title="Unload after leaving"
            value={values.idle_seconds}
            onChange={(v) => update("idle_seconds", v)}
          >
            <Form.Dropdown.Item value="60" title="1 minute" />
            <Form.Dropdown.Item value="300" title="5 minutes" />
          </Form.Dropdown>
          <Form.Description text="The model worker exits after this timeout. The audio module loads only when indexing sound. Text search loads only the text encoder, including searches for photos and recordings." />
          <Form.Description
            title="Storage"
            text={`${settings.storage_path}\nActions → Delete Selected Model keeps your indexes and original files.`}
          />
        </>
      )}
    </Form>
  );
}
