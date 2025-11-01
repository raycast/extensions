import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources";
import { Stream } from "openai/streaming";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCost } from "../hooks";
import openai, { getModelName } from "../lib/OpenAI";
import { useHistoryState } from "../store/history";
import { Action as StoreAction } from "../types";

interface Props {
  action: StoreAction;
  prompt: string;
}

export default function ExecuteAction({ action, prompt }: Props) {
  const addHistoryItem = useHistoryState((state) => state.addItem);
  const generateLock = useRef<boolean>(false);

  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<Stream<ChatCompletionChunk>>();
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

    const messages: ChatCompletionMessageParam[] = [
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
      const stream = await openai.chat.completions.create({
        model: action.model,
        messages: messages,
        temperature: parseFloat(action.temperature),
        max_tokens: +action.maxTokens === -1 ? undefined : +action.maxTokens,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      });

      setStream(stream);

      for await (const message of stream) {
        if (message.choices.length > 0) {
          const content = message.choices[0].delta?.content || "";

          setResult((prev) => prev + content);
        }

        if (message.usage) {
          setInputTokens(message.usage.prompt_tokens);
          setOutputTokens(message.usage.completion_tokens);
          setTotalTokens(message.usage.total_tokens);
        }
      }
    } catch (e) {
      const error = e as Error;
      setError(`## ⚠️ Error Encountered\n### ${error.message}`);
    } finally {
      setStream(undefined);
      generateLock.current = false;
    }
  }, [action, prompt]);

  useEffect(() => {
    generateResponse();

    return () => {
      if (stream) {
        stream.controller.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!stream && error.length === 0 && result.length > 0) {
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
  }, [result, stream]);

  let markdown = result;
  if (error.length > 0) {
    if (markdown.length > 0) {
      markdown += "\n\n---\n\n";
    }

    markdown += error;
  }

  return (
    <Detail
      isLoading={stream !== undefined}
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
          {stream && <Action title="Stop generating..." icon={Icon.Stop} onAction={() => stream.controller.abort()} />}
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action.Paste title="Paste Result" content={result} />
          {!stream && (
            <Action title="Regenerate" onAction={() => generateResponse()} icon={Icon.Redo} shortcut={Keyboard.Shortcut.Common.Refresh} />
          )}
        </ActionPanel>
      }
    />
  );
}
