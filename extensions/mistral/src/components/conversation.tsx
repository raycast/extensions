import { Action, ActionPanel, Clipboard, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { type Conversation as ConversationType, getConversations, setConversations } from "../hooks/use-conversations";
import { getSystemPrompt } from "../hooks/use-system-prompt";
import type { Preferences } from "../types/preferences";
import { client } from "../utils/mistral-client";
import { DEFAULT_MODEL_ID, FALLBACK_MODELS, validateModelId } from "../utils/models";

type Props = {
  conversation: ConversationType;
  model?: string;
};

export function Conversation({ conversation, model: propModel }: Props) {
  const [chats, setChats] = useState(conversation.chats);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const defaultModel = preferences.defaultModel || DEFAULT_MODEL_ID;
  const { value: storedModel, setValue: setCurrentModel } = useLocalStorage<string>("mistral-model", defaultModel);
  const currentModel = validateModelId(storedModel, defaultModel);
  const effectiveModel = propModel || currentModel;

  useEffect(() => {
    if (conversation.chats.length > 0 && conversation.chats[0].answer === "") {
      queueMicrotask(() => {
        streamAnswer(conversation.chats[0].question, effectiveModel);
      });
    }
  }, [conversation.chats, effectiveModel]);

  function handleSubmit() {
    if (!searchText.trim().length) return;

    const newChat = { question: searchText, answer: "" };
    setChats((prev) => [newChat, ...prev]);
    setSearchText("");
    streamAnswer(searchText, currentModel);
  }

  function extractCodeBlocks(text: string): string[] {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = text.match(codeBlockRegex);
    if (!matches) return [];
    return matches.map((block) =>
      block
        .replace(/```[\w]*\n?/g, "")
        .replace(/```$/g, "")
        .trim(),
    );
  }

  async function copyCode(answer: string) {
    const codeBlocks = extractCodeBlocks(answer);
    if (codeBlocks.length === 0) {
      showToast({ title: "No code found", style: Toast.Style.Failure });
      return;
    }
    await Clipboard.copy(codeBlocks.join("\n\n"));
    showToast({ title: "Code copied", style: Toast.Style.Success });
  }

  async function copyAnswer(answer: string) {
    await Clipboard.copy(answer);
    showToast({ title: "Response copied", style: Toast.Style.Success });
  }

  async function streamAnswer(question: string, model: string) {
    setIsLoading(true);
    showToast({ title: "Thinking...", style: Toast.Style.Animated });

    const [conversationsPromise, systemPromptPromise] = [getConversations(), getSystemPrompt()];

    try {
      const previousMessages = chats
        .filter((chat) => chat.answer && chat.answer.trim().length > 0)
        .reverse()
        .reduce<{ role: "system" | "user" | "assistant"; content: string }[]>((previous, current) => {
          previous.push({ role: "user", content: current.question });
          previous.push({ role: "assistant", content: current.answer });
          return previous;
        }, []);

      const systemPrompt = await systemPromptPromise;
      const messages = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...previousMessages,
        { role: "user" as const, content: question },
      ];

      const result = await client.chat.stream({ messages, model });

      let currentAnswer = "";
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE_MS = 50;

      for await (const chunk of result) {
        const streamText = chunk.data.choices[0].delta?.content || "";
        if (streamText) {
          currentAnswer += streamText;
          const now = Date.now();

          if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
            lastUpdateTime = now;
            const answer = currentAnswer;

            queueMicrotask(() => {
              setChats((prev) => {
                const [first, ...rest] = prev;
                return [{ ...first, answer }, ...rest];
              });
            });
          }
        }
      }

      setChats((prev) => {
        const [first, ...rest] = prev;
        return [{ ...first, answer: currentAnswer }, ...rest];
      });

      const conversations = await conversationsPromise;
      const currentConvIndex = conversations.findIndex((conv) => conv.id === conversation.id);
      const newChat = { question, answer: currentAnswer };

      if (currentAnswer.trim().length > 0) {
        if (currentConvIndex === -1) {
          conversations.unshift({ ...conversation, chats: [newChat] });
        } else {
          conversations[currentConvIndex].chats = [newChat, ...conversations[currentConvIndex].chats];
        }

        queueMicrotask(() => setConversations(conversations));
      }

      showToast({ title: "Response complete", style: Toast.Style.Success });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const is429 = errorMessage.includes("429") || errorMessage.includes("capacity exceeded");
      const modelName = FALLBACK_MODELS.find((m) => m.id === model)?.name || model;

      if (is429) {
        showFailureToast(error, {
          title: `${modelName} capacity exceeded`,
          message:
            "This model is currently overloaded. Try selecting a different model using the 🤖 dropdown or wait a moment.",
        });
      } else {
        showFailureToast(error, {
          title: "Could not stream answer",
          message:
            "Your API key may be invalid. If you just created it, you may need to wait a few minutes for it to become active.",
        });
      }

      setChats((prev) => prev.slice(1));
    }

    setIsLoading(false);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={conversation.title}
      searchBarPlaceholder="Type your message here..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Model" value={currentModel} onChange={(newValue) => setCurrentModel(newValue)}>
          <List.Dropdown.Item title="🤖 Mistral Small" value="mistral-small-latest" />
          <List.Dropdown.Item title="🤖 Mistral Medium" value="mistral-medium-latest" />
          <List.Dropdown.Item title="🤖 Mistral Large" value="mistral-large-latest" />
          <List.Dropdown.Item title="🤖 Codestral" value="codestral-latest" />
        </List.Dropdown>
      }
    >
      {chats.map((chat, index) => (
        <List.Item
          key={index}
          title={chat.question}
          subtitle={`Message ${chats.length - index}`}
          icon={Icon.Person}
          detail={
            <List.Item.Detail
              markdown={`**You:** ${chat.question}\n\n---\n\n**Mistral:**\n\n${chat.answer || "_Thinking..._"}`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Send Message" icon={Icon.ArrowRight} onAction={handleSubmit} />
              {chat.answer && (
                <ActionPanel.Section>
                  <Action
                    title="Copy Code"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                    onAction={() => copyCode(chat.answer)}
                  />
                  <Action
                    title="Copy Response"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => copyAnswer(chat.answer)}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
