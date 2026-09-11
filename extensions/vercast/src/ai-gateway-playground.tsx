import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AIGatewayError,
  createChatCompletion,
  fetchModelCatalog,
  formatCurrency,
  formatDuration,
  getModelPageUrl,
  type AIGatewayModel,
  type ChatCompletion,
  type ChatCompletionRequest,
  type JsonValue,
} from "./ai-gateway";

const AI_GATEWAY_URL = "https://vercel.com/ai-gateway";
const AI_GATEWAY_DOCS_URL = "https://vercel.com/docs/ai-gateway";
const DEFAULT_TEMPERATURE = "0.7";
const DEFAULT_MAX_TOKENS = "1024";

interface LaunchContext {
  modelId?: string;
}

interface PlaygroundValues {
  modelId: string;
  prompt: string;
  systemPrompt: string;
  temperature: string;
  maxTokens: string;
}

interface ValidationErrors {
  modelId?: string;
  prompt?: string;
  temperature?: string;
  maxTokens?: string;
}

interface CompletionResult {
  completion: ChatCompletion;
  latencyMs: number;
  values: PlaygroundValues;
}

function isLanguageModel(model: AIGatewayModel): boolean {
  return model.type?.toLocaleLowerCase() === "language";
}

function displayError(error: unknown): { title: string; message: string; action?: "preferences" | "credits" } {
  if (!(error instanceof AIGatewayError)) {
    return {
      title: "Couldn’t Generate Response",
      message: "An unexpected error occurred. Try again.",
    };
  }

  switch (error.kind) {
    case "authentication":
      return {
        title: "AI Gateway Authentication Failed",
        message: error.message,
        action: "preferences",
      };
    case "unsupported_model":
      return {
        title: "Model Unavailable",
        message: `${error.message} Choose another language model and try again.`,
      };
    case "insufficient_credits":
      return {
        title: "Insufficient AI Gateway Credits",
        message: `${error.message} Add credits in Vercel and try again.`,
        action: "credits",
      };
    case "provider_error":
      return {
        title: "Provider Request Failed",
        message: `${error.message} Retry or choose another model.`,
      };
    case "unavailable":
      return {
        title: "AI Gateway Unavailable",
        message: `${error.message} Try again shortly or choose another model.`,
      };
    case "network":
      return {
        title: "Network Request Failed",
        message: error.message,
      };
    case "rate_limit":
    case "malformed_response":
    case "not_found":
    case "insufficient_permissions":
    case "invalid_request":
      return {
        title: "Couldn’t Generate Response",
        message: error.message,
      };
    default: {
      const exhaustiveCheck: never = error.kind;
      return exhaustiveCheck;
    }
  }
}

function jsonObject(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined;
}

function metadataValue(value: JsonValue | undefined): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function gatewayMetadata(completion: ChatCompletion): Record<string, JsonValue> | undefined {
  return jsonObject(completion.providerMetadata?.gateway);
}

function actualCost(gateway: Record<string, JsonValue> | undefined): string | undefined {
  const rawCost = metadataValue(gateway?.cost);
  if (!rawCost) return undefined;

  const numericCost = Number(rawCost);
  return Number.isFinite(numericCost) ? formatCurrency(numericCost) : rawCost;
}

function finalProvider(gateway: Record<string, JsonValue> | undefined): string | undefined {
  return metadataValue(jsonObject(gateway?.routing)?.finalProvider);
}

function validate(values: PlaygroundValues, model: AIGatewayModel | undefined): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!model || model.id !== values.modelId) {
    errors.modelId = "Choose an available language model.";
  }
  if (!values.prompt.trim()) {
    errors.prompt = "Enter a prompt.";
  }

  if (values.temperature.trim()) {
    const temperature = Number(values.temperature);
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
      errors.temperature = "Enter a number from 0 to 2.";
    }
  }

  if (values.maxTokens.trim()) {
    const maxTokens = Number(values.maxTokens);
    const upperBound = model?.maxTokens ?? 1_000_000;
    if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > upperBound) {
      errors.maxTokens = `Enter a whole number from 1 to ${upperBound.toLocaleString()}.`;
    }
  }
  return errors;
}

function buildRequest(values: PlaygroundValues): ChatCompletionRequest {
  return {
    model: values.modelId,
    messages: [
      ...(values.systemPrompt.trim() ? [{ role: "system" as const, content: values.systemPrompt.trim() }] : []),
      { role: "user", content: values.prompt.trim() },
    ],
    temperature: values.temperature.trim() ? Number(values.temperature) : undefined,
    maxTokens: values.maxTokens.trim() ? Number(values.maxTokens) : undefined,
  };
}

function MissingApiKey() {
  return (
    <Detail
      markdown={`# AI Gateway API Key Required

Create an API key at [Vercel AI Gateway](${AI_GATEWAY_URL}), then add it in this extension's preferences.`}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
          <Action.OpenInBrowser title="Create AI Gateway API Key" url={AI_GATEWAY_URL} />
          <Action.OpenInBrowser title="Open AI Gateway Documentation" url={AI_GATEWAY_DOCS_URL} />
        </ActionPanel>
      }
    />
  );
}

function ResultDetail({
  result,
  onRunAgain,
}: {
  result: CompletionResult;
  onRunAgain: (values: PlaygroundValues) => void;
}) {
  const { pop } = useNavigation();
  const choice = result.completion.choices[0];
  const responseText = choice?.message.content ?? choice?.message.refusal ?? "No text response was returned.";
  const usage = result.completion.usage;
  const gateway = gatewayMetadata(result.completion);
  const gatewayGenerationId = metadataValue(gateway?.generationId);
  const provider = result.completion.provider?.trim() || finalProvider(gateway);
  const cost = actualCost(gateway);
  const markdownCopy = `# ${result.completion.model} Response\n\n${responseText}`;

  return (
    <Detail
      markdown={responseText}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Returned Model" text={result.completion.model} />
          {usage && <Detail.Metadata.Label title="Input Tokens" text={usage.promptTokens.toLocaleString()} />}
          {usage && <Detail.Metadata.Label title="Output Tokens" text={usage.completionTokens.toLocaleString()} />}
          {usage && <Detail.Metadata.Label title="Total Tokens" text={usage.totalTokens.toLocaleString()} />}
          {choice?.finishReason && <Detail.Metadata.Label title="Finish Reason" text={choice.finishReason} />}
          <Detail.Metadata.Label title="Latency" text={formatDuration(result.latencyMs)} />
          <Detail.Metadata.Label title="Generation ID" text={result.completion.id} />
          {gatewayGenerationId && gatewayGenerationId !== result.completion.id && (
            <Detail.Metadata.Label title="Gateway Generation ID" text={gatewayGenerationId} />
          )}
          {provider && <Detail.Metadata.Label title="Provider" text={provider} />}
          {cost && <Detail.Metadata.Label title="Cost" text={cost} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Response" content={responseText} />
          <Action.CopyToClipboard title="Copy Response as Markdown" content={markdownCopy} />
          <Action.CopyToClipboard title="Copy Model ID" content={result.completion.model} />
          <Action
            icon={Icon.Repeat}
            title="Run Again"
            onAction={() => {
              pop();
              onRunAgain(result.values);
            }}
          />
          <Action icon={Icon.Pencil} title="Edit Prompt" onAction={pop} />
          <Action.OpenInBrowser title="Open Model Page" url={getModelPageUrl(result.completion.model)} />
        </ActionPanel>
      }
    />
  );
}

function Playground({ apiKey, initialModelId }: { apiKey: string; initialModelId: string | undefined }) {
  const { push } = useNavigation();
  const { data: catalog, isLoading, error: catalogError, revalidate } = useCachedPromise(fetchModelCatalog, []);
  const models = useMemo(() => (catalog?.data ?? []).filter(isLanguageModel), [catalog]);
  const [values, setValues] = useState<PlaygroundValues>({
    modelId: "",
    prompt: "",
    systemPrompt: "",
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (models.length === 0 || values.modelId) return;
    const launchedModel = models.find((model) => model.id === initialModelId);
    setValues((current) => ({ ...current, modelId: launchedModel?.id ?? models[0].id }));
  }, [initialModelId, models, values.modelId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const updateValue = (field: keyof PlaygroundValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (submittedValues: PlaygroundValues) => {
    if (submittingRef.current) return;

    const model = models.find((item) => item.id === submittedValues.modelId);
    const validationErrors = validate(submittedValues, model);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    submittingRef.current = true;
    setIsSubmitting(true);
    const request = buildRequest(submittedValues);
    const start = performance.now();

    try {
      const completion = await createChatCompletion(request, { apiKey, signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;
      const result = {
        completion,
        latencyMs: performance.now() - start,
        values: submittedValues,
      };
      push(<ResultDetail result={result} onRunAgain={(runValues) => void submit(runValues)} />);
    } catch (requestError) {
      if (!mountedRef.current || controller.signal.aborted) return;
      const presentation = displayError(requestError);
      await showToast({
        style: Toast.Style.Failure,
        title: presentation.title,
        message: presentation.message,
        primaryAction:
          presentation.action === "preferences"
            ? { title: "Open Preferences", onAction: () => openExtensionPreferences() }
            : presentation.action === "credits"
              ? { title: "Open AI Gateway", onAction: () => open(AI_GATEWAY_URL) }
              : undefined,
      });
    } finally {
      if (mountedRef.current && controllerRef.current === controller) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  if (catalogError && !catalog) {
    return (
      <Detail
        markdown={`# Couldn’t Load Language Models

${catalogError instanceof Error ? catalogError.message : "The AI Gateway model catalog is unavailable."}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.OpenInBrowser title="Open AI Gateway Documentation" url={AI_GATEWAY_DOCS_URL} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Response" icon={Icon.Stars} onSubmit={() => void submit(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="modelId"
        title="Model"
        value={values.modelId}
        error={errors.modelId}
        onChange={(value) => updateValue("modelId", value)}
      >
        {models.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} icon={Icon.Stars} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Ask the model something…"
        value={values.prompt}
        error={errors.prompt}
        onChange={(value) => updateValue("prompt", value)}
      />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="Optional instructions for the model"
        value={values.systemPrompt}
        onChange={(value) => updateValue("systemPrompt", value)}
      />
      <Form.Separator />
      <Form.TextField
        id="temperature"
        title="Temperature"
        placeholder={DEFAULT_TEMPERATURE}
        value={values.temperature}
        error={errors.temperature}
        onChange={(value) => updateValue("temperature", value)}
      />
      <Form.TextField
        id="maxTokens"
        title="Max Output Tokens"
        placeholder={DEFAULT_MAX_TOKENS}
        value={values.maxTokens}
        error={errors.maxTokens}
        onChange={(value) => updateValue("maxTokens", value)}
      />
      {values.modelId && (
        <Form.Description
          title="Selected Model"
          text={
            models.find((model) => model.id === values.modelId)?.maxTokens
              ? `${values.modelId} · up to ${models
                  .find((model) => model.id === values.modelId)
                  ?.maxTokens?.toLocaleString()} output tokens`
              : values.modelId
          }
        />
      )}
    </Form>
  );
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: LaunchContext }>) {
  const { aiGatewayApiKey } = getPreferenceValues<Preferences.AiGatewayPlayground>();
  const apiKey = aiGatewayApiKey?.trim();

  if (!apiKey) {
    return <MissingApiKey />;
  }

  return <Playground apiKey={apiKey} initialModelId={launchContext?.modelId} />;
}
