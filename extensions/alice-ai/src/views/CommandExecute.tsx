import { Action, ActionPanel, Color, Detail, Icon, Keyboard, getSelectedText } from "@raycast/api";
import { GPTTokens } from "gpt-tokens";
import { ChatCompletionChunk } from "openai/resources";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import { useEffect, useState } from "react";
import openai, { getModelName } from "../lib/OpenAI";
import { useActionsState } from "../store/actions";
import { useHistoryState } from "../store/history";

interface Props {
  id: string;
}

interface SelectedText {
  text: string;
  success: boolean | undefined;
}

interface ResultMetadata {
  promptTokens: number;
  resultTokens: number;
  totalTokens: number;
  cost: number;
}

export default function CommandExecute({ id }: Props) {
  const action = useActionsState((state) => state.actions.find((a) => a.id === id));
  const addHistoryItem = useHistoryState((state) => state.addItem);

  const [stream, setStream] = useState<Stream<ChatCompletionChunk>>();
  const [chat, setChat] = useState<ChatCompletionMessageParam[]>([]);
  const [selectedText, setSelectedText] = useState<SelectedText>({ text: "", success: undefined });
  const [result, setResult] = useState<string>("");
  const [metadata, setMetadata] = useState<ResultMetadata>({
    promptTokens: 0,
    resultTokens: 0,
    totalTokens: 0,
    cost: 0,
  });

  const isReadyToGenerate = action && selectedText.success;

  const generateResponse = async () => {
    if (isReadyToGenerate === false) {
      return;
    }

    setResult("");
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: action.systemPrompt,
      },
      {
        role: "user",
        content: selectedText.text,
      },
    ];

    const stream = await openai.chat.completions.create({
      model: action.model,
      messages: messages,
      temperature: parseFloat(action.temperature),
      max_tokens: +action.maxTokens === -1 ? undefined : +action.maxTokens,
      stream: true,
    });

    setChat(messages);
    setStream(stream);

    for await (const message of stream) {
      const content = message.choices[0].delta.content || "";

      setResult((prev) => prev + content);
    }

    setStream(undefined);
  };

  useEffect(() => {
    getSelectedText()
      .then((text) => setSelectedText({ text, success: true }))
      .catch(() => setSelectedText({ text: "", success: false }));
  }, []);

  useEffect(() => {
    if (isReadyToGenerate) {
      generateResponse();
    }
  }, [isReadyToGenerate]);

  useEffect(() => {
    if (isReadyToGenerate && !stream && result.length > 0) {
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
        prompt: selectedText.text,
        result,
      });
    }
  }, [result, stream]);

  useEffect(() => {
    if (chat.length > 0) {
      const usage = new GPTTokens({
        model: action!.model as GPTTokens["model"],
        messages: chat as GPTTokens["messages"],
      });

      setMetadata({
        promptTokens: usage.promptUsedTokens,
        resultTokens: usage.completionUsedTokens,
        totalTokens: usage.usedTokens,
        cost: usage.usedUSD,
      });
    }
  }, [chat]);

  if (!action) {
    return (
      <Detail
        markdown={`## ⚠️ Action Not Found\n\nWe're sorry, but the action with the ID \`${id}\` could not be found.`}
        navigationTitle="Action Not Found"
      />
    );
  }

  if (selectedText.success === false) {
    return (
      <Detail
        markdown={`## ⚠️ No Text Selected\n\nWe're sorry, but it seems like no text has been selected. Please ensure that you highlight the desired text before attempting the action again.`}
        navigationTitle="No Text Selected"
      />
    );
  }

  return (
    <Detail
      isLoading={stream !== undefined}
      markdown={result}
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
          {!stream && (
            <Action title="Regenerate" onAction={() => generateResponse()} icon={Icon.Redo} shortcut={Keyboard.Shortcut.Common.Refresh} />
          )}
        </ActionPanel>
      }
    />
  );
}
