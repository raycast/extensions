import { RaycastChatMessage } from "../types";
import { Form, Action, ActionPanel } from "@raycast/api";
import React from "react";
import { DeleteChatHistory, SaveChatToHistory } from "../common";

interface props {
  ShowSaveChatView: React.Dispatch<React.SetStateAction<boolean>>;
  ChatHistoryKeys: string[];
  ChatMessages: RaycastChatMessage[];
}

interface form {
  name: string;
}

export function SaveChatView(props: props): JSX.Element {
  const NameInfo = "Provide a Chat Name";

  const [NameError, SetNameError] = React.useState<string | undefined>();

  /**
   * Validate Name Field.
   * @param event
   */
  function ValidateName(event: any): void {
    const value = event.target.value;
    if (value && value.length > 0 && !props.ChatHistoryKeys.find((k) => k === value)) {
      SetNameError(undefined);
    } else {
      if (value.length === 0) {
        SetNameError("Name is required");
      } else if (props.ChatHistoryKeys.find((k) => k === value)) {
        SetNameError("Name already exists");
      }
    }
  }
  /**
   * Drop Name Error.
   */
  function DropNameError(): void {
    if (NameError && NameError.length > 0) {
      SetNameError(undefined);
    }
  }
  /**
   * Save ChatHistory to Local Storage with a Name
   * @returns {Promise<void>}
   */
  async function Save(data: form): Promise<void> {
    await DeleteChatHistory("Current");
    await SaveChatToHistory(data.name, props.ChatMessages, true);
    props.ShowSaveChatView(false);
  }

  return (
    <Form
      actions={
        <ActionPanel>{!NameError && <Action.SubmitForm onSubmit={Save} title="Save Conversation" />}</ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Chat Name"
        placeholder="Enter Chat Name"
        info={NameInfo}
        error={NameError}
        onChange={DropNameError}
        onBlur={ValidateName}
      />
    </Form>
  );
}
