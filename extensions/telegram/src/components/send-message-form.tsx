import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import * as fs from "fs";
import { sendMessage, Chat } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";

interface SendMessageFormProps {
  chat: Chat;
  onSuccess?: () => void;
}

export function SendMessageForm({ chat, onSuccess }: SendMessageFormProps) {
  const [message, setMessage] = useState("");
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() && filePaths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Message",
        message: "Please enter a message or attach a file",
      });
      return;
    }

    // Validate file paths
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "File Not Found",
          message: `The file ${filePath} does not exist`,
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const authenticated = await ensureAuthenticated();
      if (!authenticated) {
        setIsLoading(false);
        return;
      }

      const config = getConfig();

      // Send message with first file (Telegram API limitation - one file per message)
      const filePath = filePaths.length > 0 ? filePaths[0] : undefined;
      await sendMessage({ config, chatId: chat.id, message, filePath });

      // If there are more files, send them in separate messages
      if (filePaths.length > 1) {
        for (let i = 1; i < filePaths.length; i++) {
          await sendMessage({ config, chatId: chat.id, message: "", filePath: filePaths[i] });
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Message Sent",
        message: `Message sent to ${chat.title}`,
      });

      // Reset form
      setMessage("");
      setFilePaths([]);

      if (onSuccess) {
        onSuccess();
      } else {
        await popToRoot();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Send Message",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Send Message to ${chat.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter your message..."
        value={message}
        onChange={setMessage}
        enableMarkdown
      />

      <Form.FilePicker
        id="files"
        title="Attachments"
        allowMultipleSelection={true}
        canChooseDirectories={false}
        value={filePaths}
        onChange={setFilePaths}
      />

      <Form.Description
        title="Note"
        text="You can attach photos, videos, or documents. Multiple files will be sent as separate messages."
      />
    </Form>
  );
}
