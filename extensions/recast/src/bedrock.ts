import { RewriteError } from "./errors";
import { homedir } from "node:os";
import { delimiter } from "node:path";
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  type ConverseStreamOutput,
} from "@aws-sdk/client-bedrock-runtime";
import {
  fromIni,
  fromEnv,
  fromNodeProviderChain,
} from "@aws-sdk/credential-providers";
import {
  type Preferences,
  SYSTEM_PROMPT,
  buildPrompt,
  resolveModelId,
  validateConfig,
} from "./config";

export interface RewriteOptions {
  text: string;
  tone: string;
  customInstruction?: string;
  preferences: Preferences;
  signal?: AbortSignal;
  onPartial?: (text: string) => void;
}

function getCredentialProvider(preferences: Preferences) {
  // GUI apps have a minimal PATH. Keep SDK validation, SSO, role assumption,
  // and refresh behavior, including credential_process in nested profiles.
  process.env.PATH = [
    ...new Set(
      [
        ...(process.env.PATH || "").split(delimiter),
        `${homedir()}/.local/bin`,
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
      ].filter(Boolean),
    ),
  ].join(delimiter);
  switch (preferences.credentialMethod) {
    case "profile":
      return fromIni({ profile: preferences.awsProfile.trim() });
    case "environment":
      return fromEnv();
    default:
      return fromNodeProviderChain();
  }
}

export async function readRewriteStream(
  stream: AsyncIterable<ConverseStreamOutput>,
  maxTokens: number,
  onPartial?: (text: string) => void,
): Promise<string> {
  const blocks = new Map<number, string>();
  let stopReason: string | undefined;
  const result = () =>
    [...blocks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, value]) => value)
      .join("\n");
  for await (const event of stream) {
    for (const key of [
      "internalServerException",
      "modelStreamErrorException",
      "serviceUnavailableException",
      "throttlingException",
      "validationException",
    ] as const) {
      if (event[key])
        throw Object.assign(
          new RewriteError(
            event[key].message ||
              "Bedrock interrupted the response. Try again.",
          ),
          { name: key[0].toUpperCase() + key.slice(1) },
        );
    }
    if (event.contentBlockDelta?.delta?.text) {
      const { delta } = event.contentBlockDelta;
      const contentBlockIndex = event.contentBlockDelta.contentBlockIndex ?? 0;
      blocks.set(
        contentBlockIndex,
        (blocks.get(contentBlockIndex) || "") + delta.text,
      );
      onPartial?.(result());
    }
    if (event.messageStop) stopReason = event.messageStop.stopReason;
  }
  if (stopReason === "max_tokens") {
    throw new RewriteError(
      `The rewrite reached the ${maxTokens}-token limit. Increase Max Tokens in extension preferences, or rewrite a shorter selection.`,
    );
  }
  if (stopReason !== "end_turn" && stopReason !== "stop_sequence") {
    if (
      stopReason === "content_filtered" ||
      stopReason === "guardrail_intervened"
    ) {
      throw new RewriteError(
        "The model blocked this rewrite. Try a different selection or instruction.",
      );
    }
    throw new RewriteError(
      "Bedrock did not finish the rewrite. Try again or use a shorter selection.",
    );
  }
  const text = result();
  if (!text.trim())
    throw new RewriteError(
      "The model returned no text. Try again or increase Max Tokens in extension preferences.",
    );
  return text;
}

export async function rewrite(options: RewriteOptions): Promise<string> {
  const { text, tone, customInstruction, preferences, signal, onPartial } =
    options;
  if (!text.trim())
    throw new RewriteError("Enter or select some text to rewrite.");
  const inferenceConfig = validateConfig(preferences);
  const modelId = resolveModelId(preferences);
  const client = new BedrockRuntimeClient({
    region: preferences.awsRegion.trim(),
    credentials: getCredentialProvider(preferences),
    maxAttempts: 3,
    retryMode: "standard",
  });
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    cancel();
  }, 60_000);
  let rejectAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = () =>
      reject(
        Object.assign(
          new RewriteError(
            timedOut
              ? "The rewrite timed out. Check your AWS connection and try again."
              : "Rewrite canceled.",
          ),
          { name: "RewriteError" },
        ),
      );
    controller.signal.addEventListener("abort", rejectAbort, { once: true });
    if (controller.signal.aborted) rejectAbort();
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await client.send(
          new ConverseStreamCommand({
            modelId,
            system: [{ text: SYSTEM_PROMPT }],
            messages: [
              {
                role: "user",
                content: [{ text: buildPrompt(text, tone, customInstruction) }],
              },
            ],
            inferenceConfig,
            // Only this verified model gets a thinking override. Other Claude
            // generations have different controls and may reject this value.
            ...(modelId.endsWith("anthropic.claude-haiku-5-5")
              ? {
                  additionalModelRequestFields: {
                    thinking: { type: "disabled" },
                  },
                }
              : {}),
          }),
          { abortSignal: controller.signal },
        );
        if (!response.stream)
          throw new RewriteError(
            "Bedrock returned no response stream. Try again.",
          );
        return readRewriteStream(
          response.stream,
          inferenceConfig.maxTokens,
          onPartial,
        );
      })(),
      aborted,
    ]);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
    if (rejectAbort)
      controller.signal.removeEventListener("abort", rejectAbort);
    client.destroy();
  }
}
