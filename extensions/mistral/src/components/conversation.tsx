import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Conversation as ConversationType, getConversations, setConversations } from "../hooks/use-conversations";
import { ModelDropdown } from "./models-dropdown";
import { useCurrentModel } from "../hooks/use-current-model";
import { client } from "../utils/mistral-client";

type Props = {
  conversation: ConversationType;
};

export function Conversation({ conversation }: Props) {
  const [chats, setChats] = useState(conversation.chats);
  const { value: model } = useCurrentModel();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hasRunEffect = useRef(false);
  useEffect(() => {
    if (!hasRunEffect.current && chats[0].answer === "") {
      streamAnswer(chats[0].question);
      hasRunEffect.current = true;
    }
  }, []);

  function handleSubmit() {
    if (!question.length) return;
    setQuestion("");
    setChats((prev) => [{ question, answer: "" }, ...prev]);
    streamAnswer(question);
  }

  async function streamAnswer(question: string) {
    setIsLoading(true);
    const toast = await showToast({ title: "Thinking...", style: Toast.Style.Animated });
    const conversations = await getConversations();

    try {
      const messages = [...chats]
        .reverse()
        .reduce<{ role: "user" | "assistant"; content: string }[]>((previous, current) => {
          if (!current.answer) return previous;
          previous.push({ role: "user", content: current.question });
          previous.push({ role: "assistant", content: current.answer });
          return previous;
        }, [])
        .concat([{ role: "user", content: question }]);
      const result = await client.chat.stream({
        messages,
        model: model ?? "mistral-small-latest",
      });

      let currentAnswer = "";
      for await (const chunk of result) {
        const streamText = chunk.data.choices[0].delta.content;
        currentAnswer += streamText;
        setChats((prev) => {
          const [first, ...rest] = prev;
          return [{ ...first, answer: currentAnswer }, ...rest];
        });
      }

      const currentConvIndex = conversations.findIndex((conv) => conv.id === conversation.id);
      const newChat = { question, answer: currentAnswer };
      if (currentConvIndex === -1) {
        conversations.unshift({ ...conversation, chats: [newChat] });
      } else {
        conversations[currentConvIndex].chats.unshift(newChat);
      }
      await setConversations(conversations);

      toast.hide();
    } catch (error) {
      toast.title = "Error occurred";
      toast.style = Toast.Style.Failure;
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }

    setIsLoading(false);
  }

  return (
    <List
      searchBarPlaceholder="Ask another question"
      searchText={question}
      onSearchTextChange={(text) => setQuestion(text)}
      isShowingDetail
      isLoading={isLoading}
      searchBarAccessory={<ModelDropdown />}
    >
      {chats.map((item, index) => (
        <List.Item
          key={index}
          title={item.question}
          subtitle={chats.length - index + ""}
          detail={<List.Item.Detail markdown={item.answer} />}
          actions={
            <ActionPanel>
              <Action title="Ask" onAction={handleSubmit} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
