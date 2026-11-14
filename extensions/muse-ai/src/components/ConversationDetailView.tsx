import { Action, ActionPanel, List, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { Conversation, FormValues, Message } from "../types";
import { streamAIResponse } from "../services/ai";
import { QuestionForm } from "./QuestionForm";
import { STREAMING_CURSOR } from "../constants";

interface ConversationDetailViewProps {
  conversation: Conversation;
  updateConversation: (id: string, update: (saved: Conversation) => Partial<Conversation>) => Promise<void>;
}

interface QAPair {
  question: Message;
  answer: Message;
  index: number;
}

type ViewMode = "list" | "asking";

export function ConversationDetailView({ conversation, updateConversation }: ConversationDetailViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [userQuestion, setUserQuestion] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(0);
  const [localMessages, setLocalMessages] = useState<Message[]>(conversation.messages);
  const [model, setModel] = useState(conversation.model);

  useEffect(() => {
    setLocalMessages(conversation.messages);
  }, [conversation.messages]);

  const generateResponse = useCallback(
    async (question: string, selectedModel?: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Generating response..." });

      try {
        const messages: Message[] = [...localMessages, { role: "user", content: question }];
        const modelToUse = selectedModel || model;

        const { fullResponse } = await streamAIResponse(messages, setStreamingText, modelToUse);

        const exchange: Message[] = [messages[messages.length - 1], { role: "assistant", content: fullResponse }];
        const newMessages: Message[] = [...localMessages, ...exchange];

        // Append to the saved record, not this view's snapshot, so a reply streaming in
        // another view of the same conversation isn't overwritten.
        await updateConversation(conversation.id, (saved) => ({
          messages: [...saved.messages, ...exchange],
          model: modelToUse,
        }));
        setLocalMessages(newMessages);
        setModel(modelToUse);

        setIsGenerating(false);
        setStreamingText("");
        setUserQuestion("");
        setSelectedMessageIndex(newMessages.length - 2);

        toast.style = Toast.Style.Success;
        toast.title = "Response completed";
      } catch (error) {
        console.error("Error:", error);
        setIsGenerating(false);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to get response";
        toast.message = error instanceof Error ? error.message : "Unknown error";
        setViewMode("asking");
      }
    },
    [localMessages, model, conversation.id, updateConversation],
  );

  const handleAskQuestion = useCallback(
    async (values: FormValues) => {
      const question = values.question.trim();

      if (!question) {
        await showFailureToast("Please enter a question");
        return;
      }

      setUserQuestion(question);
      setStreamingText("");
      setIsGenerating(true);
      setViewMode("list");

      await generateResponse(question, values.model);
    },
    [generateResponse],
  );

  const qaPairs = useMemo(() => {
    const pairs: QAPair[] = [];

    for (let i = 0; i < localMessages.length; i += 2) {
      if (localMessages[i]?.role === "user") {
        const question = localMessages[i];
        const answer = localMessages[i + 1];
        if (answer?.role === "assistant") {
          pairs.push({ question, answer, index: i });
        }
      }
    }

    if (isGenerating && userQuestion) {
      pairs.push({
        question: { role: "user", content: userQuestion },
        answer: { role: "assistant", content: streamingText },
        index: localMessages.length,
      });
    }

    return pairs.reverse();
  }, [localMessages, isGenerating, userQuestion, streamingText]);

  const handleSelectionChange = useCallback((id: string | null) => {
    if (id) setSelectedMessageIndex(parseInt(id));
  }, []);

  const handleContinue = useCallback(() => setViewMode("asking"), []);
  const handleCancel = useCallback(() => setViewMode("list"), []);

  if (viewMode === "asking") {
    return (
      <QuestionForm
        navigationTitle={`Continue: ${conversation.title}`}
        questionTitle="Continue asking..."
        questionPlaceholder="Ask Muse Spark anything…"
        defaultQuestion={userQuestion}
        defaultModel={model}
        onSubmit={handleAskQuestion}
        onCancel={handleCancel}
        additionalDescription={{
          title: "Context",
          text: `Continuing conversation with ${Math.floor(localMessages.length / 2)} messages`,
        }}
      />
    );
  }

  return (
    <List
      navigationTitle={conversation.title}
      isShowingDetail
      selectedItemId={selectedMessageIndex.toString()}
      onSelectionChange={handleSelectionChange}
    >
      {qaPairs.map((pair, idx) => {
        const isStreaming = isGenerating && idx === 0;
        const questionPreview = pair.question.content.split("\n")[0].substring(0, 50);
        const actualIndex = qaPairs.length - idx;

        return (
          <List.Item
            key={pair.index.toString()}
            id={pair.index.toString()}
            icon={Icon.Message}
            title={questionPreview + (questionPreview.length < pair.question.content.length ? "..." : "")}
            subtitle={`Q&A ${actualIndex}`}
            accessories={[{ text: isStreaming ? "Generating..." : undefined }]}
            detail={
              <List.Item.Detail
                markdown={`# Question\n\n${pair.question.content}\n\n---\n\n# Answer\n\n${pair.answer.content}${isStreaming ? STREAMING_CURSOR : ""}`}
              />
            }
            actions={
              <ActionPanel>
                {!isGenerating && (
                  <Action title="Continue This Conversation" icon={Icon.Message} onAction={handleContinue} />
                )}
                <Action.CopyToClipboard
                  title="Copy Question"
                  content={pair.question.content}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "q" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "q" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Answer"
                  content={pair.answer.content}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "a" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "a" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Q&A"
                  content={`Q: ${pair.question.content}\n\nA: ${pair.answer.content}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
