import { ActionPanel } from "@raycast/api";
import { CopyToClipboardAction } from "./index";
import { Chat } from "../type";

export const CopyActionSection = ({ chat }: { chat: Chat }) => (
  <ActionPanel.Section title="Copy">
    {chat.messages.find((msg) => msg.type === "assistant")?.content ? (
      <CopyToClipboardAction
        title="Copy Response"
        content={chat.messages.find((msg) => msg.type === "assistant")?.content || ""}
      />
    ) : null}
    {chat.messages.find((msg) => msg.type === "user")?.content ? (
      <CopyToClipboardAction
        title="Copy Question"
        content={chat.messages.find((msg) => msg.type === "user")?.content || ""}
      />
    ) : null}
    {chat.messages.length > 0 ? (
      <CopyToClipboardAction title="Copy Raw Messages" content={JSON.stringify(chat.messages, null, 2)} />
    ) : null}
  </ActionPanel.Section>
);
