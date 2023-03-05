import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useConversation } from "./utils/useConversation";

export default function Command() {
  const { messages, sendMessage, loading } = useConversation();
  const [question, setQuestion] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (messages.length > 0) {
      setSelectedItemId(messages[messages.length - 1].id);
    }
  }, [messages.length]);

  const handleQuestion = async () => {
    if (loading) {
      return;
    }
    const toast = await showToast(Toast.Style.Animated, "Loading...");
    try {
      await sendMessage(question);
      toast.style = Toast.Style.Success;
      toast.title = "Success";
      setQuestion("");
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong";
    }
  };

  return (
    <List
      filtering={false}
      selectedItemId={selectedItemId}
      searchText={question}
      onSearchTextChange={setQuestion}
      isLoading={loading}
      searchBarPlaceholder="Ask your question..."
      isShowingDetail={selectedItemId !== undefined}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" onSubmit={handleQuestion} icon={Icon.Envelope} />
        </ActionPanel>
      }
    >
      {messages.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
          title="Ask your first question to get started!"
          description="Type your question in the search bar and press enter to send it. It'll start a new ChatGPT session. Continue asking questions - the AI will remember the context!"
        />
      ) : (
        messages.map((m) => (
          <List.Item
            key={m.id}
            id={m.id}
            title={m.role === "user" ? "You" : "AI"}
            icon={
              m.role === "user"
                ? { source: Icon.QuestionMark, tintColor: Color.Orange }
                : { source: Icon.Message, tintColor: Color.Green }
            }
            subtitle={m.content.trim()}
            actions={
              <ActionPanel>
                <Action.SubmitForm title="Ask" onSubmit={handleQuestion} icon={Icon.Envelope} />
              </ActionPanel>
            }
            detail={<List.Item.Detail markdown={m.content} />}
          />
        ))
      )}
    </List>
  );
}
