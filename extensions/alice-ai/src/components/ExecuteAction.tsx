import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources";
import { Stream } from "openai/streaming";
import { useEffect, useState } from "react";
import { useMetadata } from "../hooks";
import openai, { getModelName } from "../lib/OpenAI";
import { useHistoryState } from "../store/history";
import { Action as StoreAction } from "../types";

interface Props {
  action: StoreAction;
  prompt: string;
}

export default function ExecuteAction({ action, prompt }: Props) {
  const addHistoryItem = useHistoryState((state) => state.addItem);

  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<Stream<ChatCompletionChunk>>();
  const [chat, setChat] = useState<ChatCompletionMessageParam[]>([]);
  const [result, setResult] = useState<string>("");

  const metadata = useMetadata(chat, action.model);

  const generateResponse = async () => {
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

    setChat(messages);

    try {
      const stream = await openai.chat.completions.create({
        model: action.model,
        messages: messages,
        temperature: parseFloat(action.temperature),
        max_tokens: +action.maxTokens === -1 ? undefined : +action.maxTokens,
        stream: true,
      });

      setStream(stream);

      for await (const message of stream) {
        const content = message.choices[0].delta.content || "";

        setResult((prev) => prev + content);
      }
    } catch (e) {
      const error = e as Error;
      setError(`## ⚠️ Error Encountered\n### ${error.message}`);
    } finally {
      setStream(undefined);
    }
  };

  useEffect(() => {
    generateResponse();
  }, []);

  useEffect(() => {
    if (!stream && error.length === 0 && result.length > 0) {
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result,
        },
      ]);

      addHistoryItem({
        action: action!,
        timestamp: Date.now(),
        prompt,
        result,
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
          <Detail.Metadata.Label title="Prompt Tokens" text={metadata.promptTokens.toString()} />
          <Detail.Metadata.Label title="Result Tokens" text={metadata.resultTokens.toString()} />
          <Detail.Metadata.Label title="Total Tokens" text={metadata.totalTokens.toString()} />
          <Detail.Metadata.Label title="Cost" text={`$${metadata.cost.toFixed(6)}`} />
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
