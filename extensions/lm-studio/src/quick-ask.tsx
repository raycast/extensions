import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import Ajv, { ValidateFunction } from "ajv";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";
import { ChatInput, ChatStats, JsonSchema, JsonValue } from "./types";
import { friendlyError, getExtensionPreferences, selectedTextOrClipboard } from "./lib/raycast";
import { preferredModel, useDefaultChatModel, useLMStudioModels } from "./lib/use-models";

const DEFAULT_SCHEMA = JSON.stringify(
  {
    type: "object",
    properties: {
      answer: { type: "string" },
    },
    required: ["answer"],
    additionalProperties: false,
  },
  null,
  2,
);

const IMAGE_MIME_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 4;

type QuickAskValues = {
  prompt: string;
  model: string;
  images: string[];
  temperature: string;
  maxTokens: string;
  schema?: string;
  schemaName?: string;
};

type Answer = {
  text: string;
  reasoning?: string;
  stats?: ChatStats;
  structured: boolean;
};

function parseNumber(value: string, label: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function parseSchema(source: string) {
  let schema: JsonSchema;
  try {
    schema = JSON.parse(source) as JsonSchema;
  } catch {
    throw new Error("JSON Schema must be valid JSON.");
  }
  if (!schema || Array.isArray(schema) || typeof schema !== "object") {
    throw new Error("JSON Schema must be a JSON object.");
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  let validator: ValidateFunction<JsonValue>;
  try {
    validator = ajv.compile<JsonValue>(schema);
  } catch (error) {
    throw new Error(`Invalid JSON Schema: ${friendlyError(error)}`);
  }
  return { schema, validator, ajv };
}

async function imageInput(files: string[]): Promise<ChatInput> {
  if (files.length > MAX_IMAGES) {
    throw new Error(`Choose no more than ${MAX_IMAGES} images.`);
  }

  const images = await Promise.all(
    files.map(async (file) => {
      const mimeType = IMAGE_MIME_TYPES.get(path.extname(file).toLowerCase());
      if (!mimeType) {
        throw new Error("Images must be JPEG, PNG, or WebP files.");
      }
      const fileStat = await stat(file);
      if (!fileStat.isFile()) throw new Error(`${path.basename(file)} is not a file.`);
      if (fileStat.size > MAX_IMAGE_BYTES) {
        throw new Error(`${path.basename(file)} is larger than 10 MB.`);
      }
      const contents = await readFile(file);
      return {
        type: "image" as const,
        dataUrl: `data:${mimeType};base64,${contents.toString("base64")}`,
      };
    }),
  );

  return images;
}

function ResultView(props: { initialAnswer: Answer; prompt: string; model: string; retry: () => Promise<Answer> }) {
  const [answer, setAnswer] = useState(props.initialAnswer);
  const [isLoading, setIsLoading] = useState(false);

  async function retry() {
    setIsLoading(true);
    try {
      setAnswer(await props.retry());
      await showToast({
        style: Toast.Style.Success,
        title: "Answer Regenerated",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Regenerate Answer",
        message: friendlyError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const markdown = answer.structured
    ? `# Structured Result\n\n\`\`\`json\n${answer.text}\n\`\`\``
    : answer.text || "_LM Studio returned an empty answer._";

  return (
    <Detail
      navigationTitle="LM Studio Answer"
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        answer.stats ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Model" text={props.model} />
            <Detail.Metadata.Label title="Input Tokens" text={String(answer.stats.inputTokens)} />
            <Detail.Metadata.Label title="Output Tokens" text={String(answer.stats.totalOutputTokens)} />
            <Detail.Metadata.Label title="Tokens per Second" text={answer.stats.tokensPerSecond.toFixed(1)} />
            <Detail.Metadata.Label
              title="Time to First Token"
              text={`${answer.stats.timeToFirstTokenSeconds.toFixed(2)} s`}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer.text} />
          <Action.Paste title="Paste Answer in Active App" content={answer.text} />
          <Action
            title="Regenerate Answer"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={retry}
          />
          <Action
            title="Continue in Chat"
            icon={Icon.Message}
            onAction={() =>
              launchCommand({
                name: "chat",
                type: LaunchType.UserInitiated,
                context: {
                  prefill: `Question:\n${props.prompt}\n\nPrevious answer:\n${answer.text}\n\nFollow-up: `,
                },
              })
            }
          />
          {answer.reasoning ? (
            <Action.Push
              title="View Reasoning"
              icon={Icon.LightBulb}
              target={
                <Detail
                  navigationTitle="Reasoning"
                  markdown={answer.reasoning}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Reasoning" content={answer.reasoning} />
                    </ActionPanel>
                  }
                />
              }
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default function QuickAskCommand() {
  const { push } = useNavigation();
  const { client, models, isLoading, error, refresh } = useLMStudioModels("llm");
  const { defaultModelKey, isLoadingDefaultModel } = useDefaultChatModel();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [structured, setStructured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptError, setPromptError] = useState<string>();
  const [modelError, setModelError] = useState<string>();
  const [schemaError, setSchemaError] = useState<string>();

  useEffect(() => {
    let active = true;
    void selectedTextOrClipboard()
      .then((text) => {
        if (active && text.trim()) setPrompt((current) => current || text);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingDefaultModel) return;
    if (!models.some((candidate) => candidate.key === model)) {
      setModel(preferredModel(models, defaultModelKey)?.key ?? "");
    }
  }, [defaultModelKey, isLoadingDefaultModel, model, models]);

  async function generate(values: QuickAskValues) {
    const cleanPrompt = values.prompt.trim();
    setPromptError(cleanPrompt ? undefined : "Enter a question or instruction.");
    setModelError(values.model ? undefined : "Choose a language model.");
    setSchemaError(undefined);
    if (!cleanPrompt || !values.model) return;

    const selectedModel = models.find((candidate) => candidate.key === values.model);
    if (!selectedModel) {
      setModelError("Refresh and choose an available language model.");
      return;
    }
    if (structured && values.images.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Images Are Not Available in Structured Mode",
        message: "Turn off structured JSON or remove the images.",
      });
      return;
    }
    if (values.images.length > 0 && !selectedModel.capabilities?.vision) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Model Does Not Support Images",
        message: "Choose a vision-capable model or remove the images.",
      });
      return;
    }

    let compiledSchema: ReturnType<typeof parseSchema> | undefined;
    if (structured) {
      try {
        compiledSchema = parseSchema(values.schema ?? "");
      } catch (caughtError) {
        setSchemaError(friendlyError(caughtError));
        return;
      }
    }

    let temperature: number;
    let maxTokens: number;
    try {
      temperature = parseNumber(values.temperature, "Temperature", 0, 1);
      maxTokens = Math.round(parseNumber(values.maxTokens, "Maximum tokens", 1, 131072));
    } catch (caughtError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Generation Setting",
        message: friendlyError(caughtError),
      });
      return;
    }

    let preparedImages: ChatInput = [];
    try {
      preparedImages = await imageInput(values.images);
    } catch (caughtError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Attach Images",
        message: friendlyError(caughtError),
      });
      return;
    }

    const preferences = getExtensionPreferences();
    const run = async (): Promise<Answer> => {
      if (compiledSchema) {
        const value = await client.structuredOutput({
          model: values.model,
          messages: [
            ...(preferences.systemPrompt?.trim()
              ? [
                  {
                    role: "system" as const,
                    content: preferences.systemPrompt.trim(),
                  },
                ]
              : []),
            { role: "user", content: cleanPrompt },
          ],
          schema: compiledSchema.schema,
          schemaName: values.schemaName?.trim() || "response",
          temperature,
          maxTokens,
        });
        if (!compiledSchema.validator(value)) {
          throw new Error(
            `LM Studio returned JSON that does not match the schema: ${compiledSchema.ajv.errorsText(
              compiledSchema.validator.errors,
            )}`,
          );
        }
        return { text: JSON.stringify(value, null, 2), structured: true };
      }

      const input: ChatInput = [
        { type: "message", content: cleanPrompt },
        ...(Array.isArray(preparedImages) ? preparedImages : []),
      ];
      const result = await client.chat({
        model: values.model,
        input: values.images.length > 0 ? input : cleanPrompt,
        systemPrompt: preferences.systemPrompt?.trim() || undefined,
        temperature,
        maxOutputTokens: maxTokens,
        store: false,
      });
      if (!result.text.trim() && result.errors.length > 0) {
        throw new Error(result.errors.map((item) => item.message).join("\n"));
      }
      return {
        text: result.text,
        reasoning: result.reasoning || undefined,
        stats: result.stats,
        structured: false,
      };
    };

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Asking LM Studio…",
    });
    try {
      const answer = await run();
      toast.style = Toast.Style.Success;
      toast.title = "Answer Ready";
      push(<ResultView initialAnswer={answer} prompt={cleanPrompt} model={values.model} retry={run} />);
    } catch (caughtError) {
      toast.style = Toast.Style.Failure;
      toast.title = "LM Studio Request Failed";
      toast.message = friendlyError(caughtError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Ask LM Studio"
      enableDrafts
      isLoading={isLoading || isLoadingDefaultModel || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask LM Studio" icon={Icon.Stars} onSubmit={generate} />
          <Action
            title="Refresh Models"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Ask anything…"
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          if (value.trim()) setPromptError(undefined);
        }}
        error={promptError}
        autoFocus
      />
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        onChange={(value) => {
          setModel(value);
          setModelError(undefined);
        }}
        error={modelError}
      >
        {models.map((candidate) => (
          <Form.Dropdown.Item
            key={candidate.key}
            value={candidate.key}
            title={`${candidate.displayName}${candidate.key === defaultModelKey ? " (Default)" : candidate.loadedInstances.length > 0 ? " (Loaded)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      {error ? <Form.Description title="Connection" text={error} /> : null}
      <Form.FilePicker
        id="images"
        title="Screenshots or Images"
        allowMultipleSelection
        canChooseDirectories={false}
        info={`Optional: up to ${MAX_IMAGES} JPEG, PNG, or WebP files, 10 MB each. Save a screenshot, then select it here.`}
      />
      <Form.Separator />
      <Form.TextField id="temperature" title="Temperature" defaultValue="0.7" placeholder="0.0–1.0" />
      <Form.TextField id="maxTokens" title="Maximum Tokens" defaultValue="2048" placeholder="2048" />
      <Form.Checkbox
        id="structured"
        title="Structured Output"
        label="Return JSON matching a schema"
        value={structured}
        onChange={setStructured}
      />
      {structured ? (
        <>
          <Form.TextField id="schemaName" title="Schema Name" defaultValue="response" />
          <Form.TextArea
            id="schema"
            title="JSON Schema"
            defaultValue={DEFAULT_SCHEMA}
            error={schemaError}
            onChange={() => setSchemaError(undefined)}
          />
        </>
      ) : null}
    </Form>
  );
}
