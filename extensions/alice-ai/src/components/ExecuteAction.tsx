import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { streamText } from "ai";
import type { CoreMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCost } from "../hooks";
import { getModel, getModelName } from "../lib/OpenAI";
import { useHistoryState } from "../store/history";
import { Action as StoreAction } from "../types";

interface Props {
  action: StoreAction;
  prompt: string;
}

interface UsageShape {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  raw?: Record<string, unknown>;
}

function estimateTokenCount(text: string): number {
  // Lightweight fallback approximation for GPT tokenization.
  return Math.max(1, Math.round(text.length / 4));
}

function toValidNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeUsage(usage: UsageShape): UsageShape {
  const inputTokens = toValidNumber(usage.inputTokens) ?? toValidNumber(usage.promptTokens);
  const outputTokens = toValidNumber(usage.outputTokens) ?? toValidNumber(usage.completionTokens);
  const totalTokens = toValidNumber(usage.totalTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    raw: usage.raw,
  };
}

function readUsageFromRaw(raw: Record<string, unknown> | undefined): Pick<UsageShape, "inputTokens" | "outputTokens" | "totalTokens"> {
  if (!raw) {
    return {};
  }

  const inputTokens = (raw.inputTokens ?? raw.promptTokens ?? raw.prompt_tokens) as number | undefined;
  const outputTokens = (raw.outputTokens ?? raw.completionTokens ?? raw.completion_tokens) as number | undefined;
  const totalTokens = (raw.totalTokens ?? raw.total_tokens) as number | undefined;

  return { inputTokens, outputTokens, totalTokens };
}

export default function ExecuteAction({ action, prompt }: Props) {
  const addHistoryItem = useHistoryState((state) => state.addItem);
  const generateLock = useRef<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [error, setError] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [result, setResult] = useState<string>("");

  const [inputTokens, setInputTokens] = useState<number>(0);
  const [outputTokens, setOutputTokens] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const cost = useCost(action.model, inputTokens, outputTokens);

  const generateResponse = useCallback(async () => {
    if (generateLock.current) {
      return;
    }

    generateLock.current = true;

    setError("");
    setResult("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const messages: CoreMessage[] = [
      {
        role: "system",
        content: action.systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    try {
      setIsStreaming(true);

      let usageFromFinish: UsageShape | undefined;
      let finishPartUsage: UsageShape | undefined;
      const response = streamText({
        model: getModel(action.model),
        messages,
        temperature: parseFloat(action.temperature),
        maxTokens: +action.maxTokens === -1 ? undefined : +action.maxTokens,
        abortSignal: controller.signal,
        onFinish: (event) => {
          const finishEvent = event as { usage?: UsageShape; totalUsage?: UsageShape };
          usageFromFinish = (finishEvent.totalUsage ?? finishEvent.usage) as UsageShape | undefined;
        },
      });

      let generatedText = "";
      for await (const part of response.fullStream) {
        const streamPart = part as {
          type?: string;
          text?: string;
          textDelta?: string;
          totalUsage?: UsageShape;
        };

        if (streamPart.type === "text") {
          const textChunk = streamPart.text ?? "";
          generatedText += textChunk;
          setResult((prev) => prev + textChunk);
        }

        if (streamPart.type === "text-delta") {
          const textChunk = streamPart.textDelta ?? "";
          generatedText += textChunk;
          setResult((prev) => prev + textChunk);
        }

        if (streamPart.type === "finish") {
          finishPartUsage = streamPart.totalUsage;
        }
      }

      const usageSource = response as unknown as {
        totalUsage?: Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }>;
        usage?: Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }>;
      };
      const usage = normalizeUsage(
        (finishPartUsage ?? usageFromFinish ?? (await usageSource.totalUsage) ?? (await usageSource.usage) ?? {}) as UsageShape,
      );
      const rawUsage = readUsageFromRaw(usage.raw);
      const total = usage.totalTokens ?? rawUsage.totalTokens ?? 0;

      let input = usage.inputTokens ?? rawUsage.inputTokens ?? 0;
      let output = usage.outputTokens ?? rawUsage.outputTokens ?? 0;

      if (total > 0 && input === 0 && output === 0) {
        output = Math.min(total, estimateTokenCount(generatedText));
        input = Math.max(0, total - output);
      }

      setInputTokens(input);
      setOutputTokens(output);
      setTotalTokens(total || rawUsage.totalTokens || input + output);
    } catch (e) {
      const error = e as Error;
      if (error.name !== "AbortError") {
        setError(`## ⚠️ Error Encountered\n### ${error.message}`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      generateLock.current = false;
    }
  }, [action, prompt]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    generateResponse();
  }, [generateResponse]);

  useEffect(() => {
    if (!isStreaming && error.length === 0 && result.length > 0) {
      addHistoryItem({
        action: action!,
        timestamp: Date.now(),
        prompt,
        result,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        },
      });
    }
  }, [result, isStreaming]);

  let markdown = result;
  if (error.length > 0) {
    if (markdown.length > 0) {
      markdown += "\n\n---\n\n";
    }

    markdown += error;
  }

  return (
    <Detail
      isLoading={isStreaming}
      markdown={markdown}
      navigationTitle={action.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Model">
            <Detail.Metadata.TagList.Item text={getModelName(action.model)} color={Color.SecondaryText} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Input Tokens" text={inputTokens.toString()} />
          <Detail.Metadata.Label title="Output Tokens" text={outputTokens.toString()} />
          <Detail.Metadata.Label title="Total Tokens" text={totalTokens.toString()} />
          <Detail.Metadata.Label title="Cost" text={`$${cost.toFixed(6)}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isStreaming && <Action title="Stop Generating…" icon={Icon.Stop} onAction={() => abortControllerRef.current?.abort()} />}
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action.Paste title="Paste Result" content={result} />
          {!isStreaming && (
            <Action title="Regenerate" onAction={() => generateResponse()} icon={Icon.Redo} shortcut={Keyboard.Shortcut.Common.Refresh} />
          )}
        </ActionPanel>
      }
    />
  );
}
