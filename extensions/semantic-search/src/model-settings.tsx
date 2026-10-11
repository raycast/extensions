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

import { connectService } from "./service";
import { EngineSetup } from "./engine-setup";
import { addExclusionFolders, reconcileValues } from "./settings-values";

type Values = {
  roots: string;
  model_variant: string;
  model_url: string;
  dimensions: string;
  enable_documents: boolean;
  enable_images: boolean;
  enable_video: boolean;
  enable_audio: boolean;
  video_segment_seconds: string;
  audio_segment_seconds: string;
  thumbnail_px: string;
  chunk_tokens: string;
  idle_seconds: string;
  excluded_paths: string;
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
  last_index_summary?: {
    added: number;
    updated: number;
    unchanged: number;
    deleted: number;
    errors: number;
    finished_at?: number;
    cancelled?: boolean;
  };
  files: number;
  chunks: number;
  database_bytes?: number;
  indexing: boolean;
  progress?: {
    processed: number;
    total: number;
    errors: number;
    current_chunks_done: number;
    current_chunks_total: number;
  };
};
type Settings = {
  models: ModelSource[];
  storage_path: string;
  current: Record<string, string | number | boolean | string[]>;
  profiles?: Record<string, Record<string, string | number | boolean>>;
  job: {
    state: string;
    error?: string;
    index_errors?: number;
    exclusion_cleanup_pending?: number;
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
  const [setupMessage, setSetupMessage] = useState("Preparing local search…");
  const [settings, setSettings] = useState<Settings>();
  const [indexStatus, setIndexStatus] = useState<IndexStatus>();
  const [error, setError] = useState("");
  const [values, setValues] = useState<Values>();
  const [customModel, setCustomModel] = useState<ModelSource>();
  const [modelError, setModelError] = useState("");
  const [checkingModel, setCheckingModel] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editExclusionPaths, setEditExclusionPaths] = useState(false);
  const submittedValues = useRef<Values | undefined>(undefined);
  const serverValues = useRef<Values | undefined>(undefined);
  const mutationRevision = useRef(0);
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
      if (pending) return;
      pending = true;
      const revision = mutationRevision.current;
      try {
        const [response, statusResponse] = await Promise.all([
          fetch(`${baseURL}/v1/settings`),
          fetch(`${baseURL}/v1/status`),
        ]);
        if (!response.ok || !statusResponse.ok)
          throw new Error(
            `Service returned ${!response.ok ? response.status : statusResponse.status}`,
          );
        const data = (await response.json()) as Settings;
        const status = (await statusResponse.json()) as IndexStatus;
        if (active && revision === mutationRevision.current) {
          setSettings(data);
          setIndexStatus(status);
          setError("");
          const normalized = Object.fromEntries(
            Object.entries(data.current).map(([k, v]) => [
              k,
              Array.isArray(v)
                ? v.join("\n")
                : typeof v === "boolean"
                  ? v
                  : String(v),
            ]),
          ) as Values;
          const submission =
            data.job.state === "complete" ? submittedValues.current : undefined;
          if (["complete", "error"].includes(data.job.state))
            submittedValues.current = undefined;
          const priorServer = serverValues.current;
          serverValues.current = normalized;
          setValues((previous) =>
            submission &&
            JSON.stringify(previous) === JSON.stringify(submission)
              ? normalized
              : reconcileValues(previous, priorServer, normalized),
          );
        }
      } catch (e) {
        if (active) setError(String(e));
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
  }, [baseURL]);
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
        const response = await fetch(`${baseURL}/v1/models/inspect`, {
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
          if (model.capabilities)
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
    !!indexStatus?.indexing ||
    ["downloading", "applying", "indexing", "cancelling"].includes(
      settings?.job.state || "",
    );
  const selectedModel =
    values?.model_variant === "custom"
      ? customModel
      : settings?.models.find((m) => m.id === values?.model_variant);
  const dirty =
    values &&
    settings &&
    Object.entries(values).some(([key, value]) => {
      if (key === "model_url" && values.model_variant !== "custom")
        return false;
      const current = settings.current[key];
      return (
        String(value) !==
        (Array.isArray(current) ? current.join("\n") : String(current ?? ""))
      );
    });
  const exclusionsDirty =
    !!values &&
    !!settings &&
    values.excluded_paths !==
      ((settings.current.excluded_paths as string[]) || []).join("\n");
  const onlyExclusionsDirty =
    !!dirty &&
    Object.entries(values || {}).every(
      ([key, value]) =>
        key === "excluded_paths" ||
        (key === "model_url" && values?.model_variant !== "custom") ||
        String(value) ===
          (Array.isArray(settings?.current[key])
            ? (settings?.current[key] as string[]).join("\n")
            : String(settings?.current[key] ?? "")),
    );
  const applyTitle =
    busy && !exclusionsDirty
      ? "Indexing — Cancel in Actions"
      : busy && exclusionsDirty
        ? "Save Excluded Folders"
        : !values?.roots.trim()
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
      ]
        .filter(Boolean)
        .join(" · ") || "no changes"
    : "";
  const scanSummary = indexStatus?.indexing
    ? progress && progress.total
      ? `Indexing: ${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()} checked (${Math.floor((progress.processed / progress.total) * 100)}%). ${Math.max(0, progress.total - progress.processed).toLocaleString()} remaining.${progress.errors ? ` ${progress.errors} skipped.` : ""}${progress.current_chunks_total ? `\nCurrent file: ${progress.current_chunks_done} / ${progress.current_chunks_total} segments.` : ""}`
      : "Indexing: discovering files…"
    : lastScan
      ? `Last ${lastScan.cancelled ? "update cancelled" : "update"}${lastScan.finished_at ? `: ${new Date(lastScan.finished_at * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""} · ${changesSummary}${lastScan.errors ? ` · ${lastScan.errors} skipped${settings?.job.report_path ? " (report in Actions)" : ""}` : ""}`
      : "Choose folders, then update the search index (⌘R).";
  const indexOverview = `${(indexStatus?.files ?? 0).toLocaleString()} files · ${(indexStatus?.chunks ?? 0).toLocaleString()} vectors${indexStatus?.database_bytes !== undefined ? ` · ${(indexStatus.database_bytes / 1e6).toFixed(1)} MB on disk` : ""}\n${contentCounts || ""}\n${scanSummary}`;
  const operationMessage =
    settings?.job.state === "cancelling"
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
  const update = (key: keyof Values, value: string | boolean) =>
    setValues((previous) =>
      previous ? { ...previous, [key]: value } : previous,
    );
  const downloadModel = async (variant = values?.model_variant) => {
    if (!variant || busy) return;
    try {
      const response = await fetch(`${baseURL}/v1/models/download`, {
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
    setValues((previous) => {
      if (!previous) return previous;
      const next = { ...previous, model_variant: variant };
      if (saved)
        for (const [key, value] of Object.entries(saved)) {
          if (key in next)
            (next as Record<string, string | boolean>)[key] =
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
      const response = await fetch(`${baseURL}/v1/index/cancel`, {
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
      const response = await fetch(`${baseURL}/v1/models/delete`, {
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
  const saveExclusions = async () => {
    if (!values || savingExclusions) return;
    const submitted = values.excluded_paths;
    setSavingExclusions(true);
    mutationRevision.current += 1;
    try {
      const response = await fetch(`${baseURL}/v1/exclusions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excluded_paths: submitted
            .split(/\r?\n/)
            .map((path) => path.trim())
            .filter(Boolean),
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
      if (serverValues.current)
        serverValues.current = {
          ...serverValues.current,
          excluded_paths: data.excluded_paths.join("\n"),
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
        previous?.excluded_paths === submitted
          ? { ...previous, excluded_paths: data.excluded_paths.join("\n") }
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
      mutationRevision.current += 1;
      setSavingExclusions(false);
    }
  };
  const apply = async () => {
    if (!values || savingExclusions) return;
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
    if (!values.roots.trim()) {
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
    try {
      const response = await fetch(`${baseURL}/v1/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          roots: (values.roots || "")
            .split(/\r?\n/)
            .map((path) => path.trim())
            .filter(Boolean),
          excluded_paths: (values.excluded_paths || "")
            .split(/\r?\n/)
            .map((path) => path.trim())
            .filter(Boolean),
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
    }
  };
  const indexFiles = async () => {
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
      const response = await fetch(`${baseURL}/v1/index/start`, {
        method: "POST",
      });
      if (!response.ok)
        throw new Error(
          ((await response.json()) as { detail?: string }).detail ||
            "Indexing failed",
        );
      await showToast({
        style: Toast.Style.Success,
        title: "Updating search index",
        message:
          "New and changed files are indexed. Unchanged files are skipped.",
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
  if (!baseURL)
    return (
      <EngineSetup
        message={error || setupMessage}
        failed={!!error}
        retry={() => setRetry((value) => value + 1)}
      />
    );
  if (!settings || !values)
    return (
      <List isLoading={!error}>
        <List.Item
          title={error ? "Setup Needs Attention" : setupMessage}
          subtitle={
            error ||
            "The local engine is prepared automatically on first launch."
          }
          icon={error ? Icon.ExclamationMark : Icon.Download}
          actions={
            <ActionPanel>
              <Action
                title="Retry Setup"
                onAction={() => {
                  setError("");
                  void connectService(setSetupMessage)
                    .then(setBaseURL)
                    .catch((e) => setError(String(e)));
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  return (
    <Form
      isLoading={
        savingExclusions ||
        ["downloading", "applying"].includes(settings.job.state)
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title={applyTitle} onSubmit={apply} />
          {(indexStatus?.indexing ||
            ["indexing", "cancelling"].includes(settings.job.state)) && (
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
      <Form.FilePicker
        id="roots"
        title="Folders to Search"
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={true}
        value={(values.roots || "").split(/\r?\n/).filter(Boolean)}
        onChange={(folders) => update("roots", folders.join("\n"))}
      />
      <Form.FilePicker
        id="excluded_folders"
        title="Add excluded folders"
        canChooseFiles={false}
        canChooseDirectories={true}
        allowMultipleSelection={true}
        value={[]}
        onChange={(folders) =>
          setValues((previous) =>
            previous
              ? {
                  ...previous,
                  excluded_paths: addExclusionFolders(
                    previous.excluded_paths,
                    folders,
                  ),
                }
              : previous,
          )
        }
      />
      <Form.Description
        title="Excluded folders"
        text={
          values.excluded_paths.trim()
            ? values.excluded_paths
                .split(/\r?\n/)
                .filter(Boolean)
                .map((path) => path.replace(/\/$/, "").split("/").pop() || "/")
                .join(" · ")
            : "None"
        }
      />
      <Form.Checkbox
        id="edit_exclusion_paths"
        label="Edit exclusion paths manually"
        value={editExclusionPaths}
        onChange={setEditExclusionPaths}
      />
      {editExclusionPaths && (
        <Form.TextArea
          id="excluded_paths"
          title="Exclusion paths"
          placeholder="~/Downloads/folder-to-exclude"
          value={values.excluded_paths}
          onChange={(v) => update("excluded_paths", v)}
        />
      )}
      <Form.Description text="Choose folders to add; edit paths to remove. Apply exclusions during indexing — other folders continue. Original files are preserved." />
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
