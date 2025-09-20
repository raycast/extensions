import { Action, ActionPanel, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ModelDropdown } from "./components/models-dropdown";
import { Conversation } from "./components/conversation";

export default function Command() {
  const [question, setQuestion] = useState("");
  const { push } = useNavigation();

  async function handleSubmit() {
    if (question.length) {
      const newConversation = {
        id: Math.random().toString(36).slice(7),
        title: question,
        date: new Date().toString(),
        chats: [{ question, answer: "" }],
      };
      push(<Conversation conversation={newConversation} />);
    }
  }

  return (
    <List
      searchBarPlaceholder="Ask Mistral"
      searchText={question}
      onSearchTextChange={(text) => setQuestion(text)}
      searchBarAccessory={<ModelDropdown />}
      actions={
        <ActionPanel>
          <Action title="Ask" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: "mistral-logo.svg" }}
        title="Ask Mistral"
        description="Type your message and hit enter"
      />
    </List>
  );
}
