import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { LMStudioClient } from "./lib/lmstudio";
import { friendlyError } from "./lib/raycast";
import { useDefaultChatModel, useLMStudioModels } from "./lib/use-models";
import { DownloadStatus, LMStudioModel } from "./types";

type ModelFilter = "all" | "llm" | "embedding";

function formatBytes(bytes?: number) {
  if (bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unit).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function parseOptionalInteger(value: string, label: string, options: { minimum?: number; maximum?: number } = {}) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  const minimum = options.minimum ?? 1;
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${label} must be a whole number of at least ${minimum}.`);
  }
  if (options.maximum !== undefined && parsed > options.maximum) {
    throw new Error(`${label} cannot exceed ${options.maximum.toLocaleString()}.`);
  }
  return parsed;
}

function LoadModelForm(props: { model: LMStudioModel; client: LMStudioClient; onLoaded: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function load(values: {
    contextLength: string;
    evalBatchSize: string;
    flashAttention: boolean;
    offloadKvCacheToGpu: boolean;
  }) {
    let contextLength: number | undefined;
    let evalBatchSize: number | undefined;
    try {
      contextLength = parseOptionalInteger(values.contextLength, "Context length", {
        maximum: props.model.maxContextLength,
      });
      evalBatchSize = parseOptionalInteger(values.evalBatchSize, "Evaluation batch size");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Load Configuration",
        message: friendlyError(error),
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Loading ${props.model.displayName}…`,
    });
    try {
      const result = await props.client.loadModel({
        model: props.model.key,
        contextLength,
        evalBatchSize,
        flashAttention: values.flashAttention || undefined,
        offloadKvCacheToGpu: values.offloadKvCacheToGpu || undefined,
        echoLoadConfig: true,
      });
      await props.onLoaded();
      toast.style = Toast.Style.Success;
      toast.title = "Model Loaded";
      toast.message = `${result.instanceId} loaded in ${result.loadTimeSeconds.toFixed(1)} s`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Load Model";
      toast.message = friendlyError(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={`Load ${props.model.displayName}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Load Model" icon={Icon.Play} onSubmit={load} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Model"
        text={`${props.model.displayName} · ${formatBytes(props.model.sizeBytes)} · maximum context ${props.model.maxContextLength.toLocaleString()}`}
      />
      <Form.TextField
        id="contextLength"
        title="Context Length"
        placeholder={`Server default (maximum ${props.model.maxContextLength.toLocaleString()})`}
        info="Leave blank to use LM Studio's default."
      />
      <Form.TextField
        id="evalBatchSize"
        title="Evaluation Batch Size"
        placeholder="Server default"
        info="Leave blank unless you need to tune prompt processing."
      />
      <Form.Checkbox id="flashAttention" title="Flash Attention" label="Request flash attention when supported" />
      <Form.Checkbox id="offloadKvCacheToGpu" title="KV Cache" label="Request GPU offload for the KV cache" />
    </Form>
  );
}

function progressMarkdown(status: DownloadStatus, model: string) {
  const downloaded = status.downloadedBytes ?? 0;
  const total = status.totalSizeBytes ?? 0;
  const ratio = total > 0 ? Math.min(1, downloaded / total) : 0;
  const filled = Math.round(ratio * 20);
  const bar = `${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
  const percent = total > 0 ? ` ${(ratio * 100).toFixed(1)}%` : "";
  const headline =
    status.status === "completed" || status.status === "already_downloaded"
      ? "Download Complete"
      : status.status === "failed"
        ? "Download Failed"
        : status.status === "paused"
          ? "Download Paused"
          : "Downloading Model";

  return `# ${headline}\n\n**${model}**\n\n\`${bar}\`${percent}\n\n${formatBytes(status.downloadedBytes)} of ${formatBytes(status.totalSizeBytes)}${
    status.bytesPerSecond ? ` · ${formatBytes(status.bytesPerSecond)}/s` : ""
  }${status.estimatedCompletion ? `\n\nEstimated completion: ${status.estimatedCompletion}` : ""}`;
}

function DownloadProgressView(props: {
  client: LMStudioClient;
  model: string;
  initialStatus: DownloadStatus;
  onCompleted: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [status, setStatus] = useState(props.initialStatus);
  const [error, setError] = useState<string>();
  const isActive = status.status === "downloading";

  useEffect(() => {
    if (!props.initialStatus.jobId || props.initialStatus.status !== "downloading") {
      return;
    }
    const controller = new AbortController();
    void props.client
      .waitForDownload(props.initialStatus.jobId, {
        signal: controller.signal,
        onProgress: setStatus,
      })
      .then(async (finalStatus) => {
        setStatus(finalStatus);
        if (finalStatus.status === "completed" || finalStatus.status === "already_downloaded") {
          await props.onCompleted();
          await showToast({
            style: Toast.Style.Success,
            title: "Model Downloaded",
          });
        } else if (finalStatus.status === "failed") {
          setError("LM Studio reported that the download failed.");
        }
      })
      .catch((caughtError) => {
        if (!controller.signal.aborted) setError(friendlyError(caughtError));
      });
    return () => controller.abort();
  }, [props.client, props.initialStatus, props.onCompleted]);

  return (
    <Detail
      navigationTitle="Download Model"
      isLoading={isActive}
      markdown={`${progressMarkdown(status, props.model)}${error ? `\n\n> ${error}` : ""}`}
      actions={
        <ActionPanel>
          <Action title="Close" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function DownloadModelForm(props: { client: LMStudioClient; onCompleted: () => Promise<void> }) {
  const { push, pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [modelError, setModelError] = useState<string>();

  async function download(values: { model: string; quantization: string }) {
    const model = values.model.trim();
    setModelError(model ? undefined : "Enter a model identifier or Hugging Face URL.");
    if (!model) return;

    const confirmed = await confirmAlert({
      title: `Download “${model}”?`,
      message: "Model downloads can be large and consume significant disk space. LM Studio will manage the download.",
      primaryAction: { title: "Download Model" },
    });
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const status = await props.client.downloadModel({
        model,
        quantization: values.quantization.trim() || undefined,
      });
      if (status.status === "completed" || status.status === "already_downloaded") {
        await props.onCompleted();
        await showToast({
          style: Toast.Style.Success,
          title: status.status === "already_downloaded" ? "Model Already Downloaded" : "Model Downloaded",
        });
        pop();
        return;
      }
      if (!status.jobId) {
        throw new Error("LM Studio started the download without returning a job ID.");
      }
      push(
        <DownloadProgressView
          client={props.client}
          model={model}
          initialStatus={status}
          onCompleted={props.onCompleted}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Download Model",
        message: friendlyError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Download Model"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download Model" icon={Icon.Download} onSubmit={download} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="model"
        title="Model"
        placeholder="publisher/model or Hugging Face URL"
        error={modelError}
        onChange={() => setModelError(undefined)}
        autoFocus
      />
      <Form.TextField id="quantization" title="Quantization" placeholder="Optional, for example Q4_K_M" />
      <Form.Description
        title="Download Source"
        text="LM Studio resolves and downloads the model. Confirm the publisher and expected size before continuing."
      />
    </Form>
  );
}

function ModelDetail(props: { model: LMStudioModel; isDefault: boolean }) {
  const { model } = props;
  const capabilityTags = [
    ...(model.capabilities?.vision ? ["Vision"] : []),
    ...(model.capabilities?.trainedForToolUse ? ["Tools"] : []),
    ...(model.capabilities?.reasoning ? ["Reasoning"] : []),
  ];

  return (
    <List.Item.Detail
      markdown={model.description ? model.description : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Identifier" text={model.key} />
          <List.Item.Detail.Metadata.Label title="Publisher" text={model.publisher} />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={model.type === "llm" ? "Language Model" : "Embedding Model"}
          />
          {model.type === "llm" ? (
            <List.Item.Detail.Metadata.Label title="Default Chat Model" text={props.isDefault ? "Yes" : "No"} />
          ) : null}
          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(model.sizeBytes)} />
          <List.Item.Detail.Metadata.Label title="Parameters" text={model.paramsString ?? "—"} />
          <List.Item.Detail.Metadata.Label
            title="Quantization"
            text={
              model.quantization
                ? `${model.quantization.name ?? "Unknown"}${model.quantization.bitsPerWeight ? ` · ${model.quantization.bitsPerWeight} bits/weight` : ""}`
                : "—"
            }
          />
          <List.Item.Detail.Metadata.Label title="Format" text={model.format?.toUpperCase() ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Architecture" text={model.architecture ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Maximum Context" text={model.maxContextLength.toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Selected Variant" text={model.selectedVariant ?? "—"} />
          {capabilityTags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Capabilities">
              {capabilityTags.map((capability) => (
                <List.Item.Detail.Metadata.TagList.Item key={capability} text={capability} color={Color.Purple} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Loaded Instances" text={String(model.loadedInstances.length)} />
          {model.loadedInstances.map((instance, index) => (
            <List.Item.Detail.Metadata.Label
              key={instance.id}
              title={`Instance ${index + 1}`}
              text={`${instance.id} · context ${instance.config.contextLength.toLocaleString()}`}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function ManageModelsCommand() {
  const { client, models, isLoading, error, refresh } = useLMStudioModels();
  const { defaultModelKey, isLoadingDefaultModel, setDefaultModelKey } = useDefaultChatModel();
  const [filter, setFilter] = useState<ModelFilter>("all");

  const visibleModels = filter === "all" ? models : models.filter((model) => model.type === filter);

  async function unload(model: LMStudioModel, instanceId: string) {
    const confirmed = await confirmAlert({
      title: `Unload ${model.displayName}?`,
      message: `Unload instance ${instanceId}? Active requests using it may fail.`,
      primaryAction: {
        title: "Unload Model",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Unloading ${model.displayName}…`,
    });
    try {
      await client.unloadModel(instanceId);
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = "Model Unloaded";
    } catch (caughtError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Unload Model";
      toast.message = friendlyError(caughtError);
    }
  }

  async function makeDefault(model: LMStudioModel) {
    try {
      await setDefaultModelKey(model.key);
      await showToast({
        style: Toast.Style.Success,
        title: "Default Chat Model Updated",
        message: model.displayName,
      });
    } catch (caughtError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Save Default Model",
        message: friendlyError(caughtError),
      });
    }
  }

  const downloadForm = <DownloadModelForm client={client} onCompleted={refresh} />;

  return (
    <List
      navigationTitle="Manage Models"
      isLoading={isLoading || isLoadingDefaultModel}
      isShowingDetail={visibleModels.length > 0}
      searchBarPlaceholder="Search downloaded models…"
      searchBarAccessory={
        <List.Dropdown tooltip="Model Type" value={filter} onChange={(value) => setFilter(value as ModelFilter)}>
          <List.Dropdown.Item title="All Models" value="all" />
          <List.Dropdown.Item title="Language Models" value="llm" />
          <List.Dropdown.Item title="Embedding Models" value="embedding" />
        </List.Dropdown>
      }
    >
      {visibleModels.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.Box}
          title={error ?? "No Models Found"}
          description={
            error
              ? "Start LM Studio's local server and verify the extension preferences."
              : "Change the filter, refresh, or download a model."
          }
          actions={
            <ActionPanel>
              <Action title="Refresh Models" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action.Push title="Download Model" icon={Icon.Download} target={downloadForm} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        visibleModels.map((model) => (
          <List.Item
            key={model.key}
            icon={model.type === "llm" ? Icon.Bubble : Icon.Text}
            title={model.displayName}
            subtitle={`${model.paramsString ?? model.publisher} · ${model.quantization?.name ?? "default"}`}
            keywords={[model.key, model.publisher, model.architecture ?? ""]}
            accessories={[
              model.type === "llm" && model.key === defaultModelKey
                ? { tag: { value: "Default", color: Color.Purple } }
                : model.loadedInstances.length > 0
                  ? { tag: { value: "Loaded", color: Color.Green } }
                  : {
                      tag: {
                        value: model.type === "llm" ? "LLM" : "Embedding",
                        color: Color.Blue,
                      },
                    },
            ]}
            detail={<ModelDetail model={model} isDefault={model.key === defaultModelKey} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title={model.loadedInstances.length > 0 ? "Load Another Instance" : "Load Model"}
                  icon={Icon.Play}
                  target={<LoadModelForm model={model} client={client} onLoaded={refresh} />}
                />
                {model.type === "llm" && model.key !== defaultModelKey ? (
                  <Action title="Set as Default Chat Model" icon={Icon.Star} onAction={() => makeDefault(model)} />
                ) : null}
                {model.loadedInstances.map((instance) => (
                  <Action
                    key={instance.id}
                    title={model.loadedInstances.length > 1 ? `Unload Instance ${instance.id}` : "Unload Model"}
                    icon={Icon.Eject}
                    style={Action.Style.Destructive}
                    onAction={() => unload(model, instance.id)}
                  />
                ))}
                <Action.Push title="Download Model" icon={Icon.Download} target={downloadForm} />
                <Action
                  title="Refresh Models"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
