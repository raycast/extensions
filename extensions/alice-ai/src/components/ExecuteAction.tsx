import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCost } from "../hooks";
import { ReasoningLevels, getModelName, getReasoningLevel, isReasoningModel } from "../lib/OpenAI";
import { generateActionResponse } from "../lib/generateActionResponse";
import { useHistoryState } from "../store/history";
import { Action as StoreAction } from "../types";

interface Props {
  action: StoreAction;
  prompt: string;
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
    setInputTokens(0);
    setOutputTokens(0);
    setTotalTokens(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsStreaming(true);
      const response = await generateActionResponse(action, prompt, controller.signal, setResult);
      setInputTokens(response.tokens.input);
      setOutputTokens(response.tokens.output);
      setTotalTokens(response.tokens.total);

      if (response.text.length > 0) {
        addHistoryItem({
          action,
          timestamp: Date.now(),
          prompt,
          result: response.text,
          tokens: response.tokens,
        });
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        const message = e instanceof Error ? e.message : String(e);
        setError(`## ⚠️ Error Encountered\n### ${message}`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      generateLock.current = false;
    }
  }, [action, prompt, addHistoryItem]);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    generateResponse();
  }, [generateResponse]);

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
          {isReasoningModel(action.model) && (
            <Detail.Metadata.Label title="Reasoning Level" text={ReasoningLevels[getReasoningLevel(action.model, action.reasoningLevel)]} />
          )}
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
