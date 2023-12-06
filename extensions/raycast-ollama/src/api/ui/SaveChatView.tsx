import { OllamaApiGenerateResponse } from "../types";
import { Form, Action, ActionPanel, LocalStorage } from "@raycast/api";
import React from "react";

interface props {
  ShowSaveChatView: React.Dispatch<React.SetStateAction<boolean>>;
  ChatHistory: Map<string, [string, string, OllamaApiGenerateResponse][] | undefined>;
}

export function SaveChatView(props: props): JSX.Element {
  const [ChatName, SetChatName]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");

  /**
   * Save ChatHistory to Local Storage with a Name
   * @returns {Promise<void>}
   */
  async function SaveChatToHistory(): Promise<void> {
    const chat = props.ChatHistory.get("Current");
    if (chat) {
      props.ChatHistory.set(ChatName, chat);
      props.ChatHistory.set("Current", undefined);
      await LocalStorage.setItem("chatName", "Current");
      await LocalStorage.setItem("answerListHistory", JSON.stringify([...props.ChatHistory]));
      props.ShowSaveChatView(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={SaveChatToHistory} title="Save Conversation" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="chatName"
        title="Chat Name"
        placeholder="Enter Chat Name"
        value={ChatName}
        onChange={SetChatName}
      />
    </Form>
  );
}
