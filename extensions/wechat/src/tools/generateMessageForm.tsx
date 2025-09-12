import { AI, Action, ActionPanel, Clipboard, Form, Icon, Toast, closeMainWindow, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { wechatService } from "../services/wechatService";
import { GenerateMessageFormProps } from "../types";

export default function GenerateMessageForm({ contactName, contactId }: GenerateMessageFormProps) {
  const [input, setInput] = useState<string>("");

  const handleSubmit = async () => {
    if (!input.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input cannot be empty",
        message: "Please enter the content to send.",
      });
      return;
    }

    try {
      // Show a loading toast while generating the message
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating AI message...",
      });

      // Call the AI API to generate the message
      const response = await AI.ask(`
        Based on the following input, generate a message to send to ${contactName}:
        User input: "${input}"
        
        Generate a natural, friendly, and concise message.
      `);

      const generatedMessage = response.trim();

      // Copy the generated message to the clipboard
      await Clipboard.copy(generatedMessage);

      // Show a success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Message generated",
        message: "The content has been copied to the clipboard.",
      });

      // Call the chat function to open the WeChat chat window
      await wechatService.startChat(contactId);

      // Close the current form window
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      console.error("Failed to generate message or start chat:", error);
      await showFailureToast(error, { title: "Failed to generate message or start chat" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="AI Message & Paste to Chat" icon={Icon.Wand} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="userInput"
        title="AI content"
        placeholder={`Generate AI content for ${contactName}...`}
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}
