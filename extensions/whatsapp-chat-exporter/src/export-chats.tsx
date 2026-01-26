import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import os from "os";
import path from "path";
import { WhatsAppClient } from "./utils/whatsapp";
import { exportChat } from "./utils/export";
import { Chat, ExportFormat } from "./types";

const DEFAULT_EXPORT_PATH = path.join(
  os.homedir(),
  "Desktop",
  "WhatsApp-Exports",
);

export default function Command() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [client] = useState(() => new WhatsAppClient());

  // Form State
  const [selectedChatId, setSelectedChatId] = useState<string>("all");
  const [destination, setDestination] = useState<string>(DEFAULT_EXPORT_PATH);
  const [includeMedia, setIncludeMedia] = useState<boolean>(false);
  const [format, setFormat] = useState<ExportFormat>("json");

  useEffect(() => {
    async function fetchChats() {
      try {
        await client.init();
        const fetchedChats = await client.getChats();
        setChats(fetchedChats);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Database Error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    fetchChats();
  }, []);

  async function handleSubmit() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Exporting...",
    });

    try {
      // Resolve path (expand ~ if needed, though usually handled by os.homedir join)
      let resolveDest = destination;
      if (destination.startsWith("~")) {
        resolveDest = destination.replace("~", os.homedir());
      }

      // Get media base path from client if media export enabled
      const mediaBasePathRaw = includeMedia ? client.getMediaBasePath() : null;
      const mediaBasePath = mediaBasePathRaw || undefined;

      if (selectedChatId === "all") {
        let count = 0;
        for (const chat of chats) {
          // Need to parse ID back to number for the query
          const messages = await client.getMessages(
            Number(chat.id),
            includeMedia,
          );
          await exportChat(
            chat,
            messages,
            resolveDest,
            format,
            includeMedia,
            mediaBasePath,
          );
          count++;
          toast.message = `Exported ${count}/${chats.length}`;
        }
        toast.style = Toast.Style.Success;
        toast.title = "Export Complete";
        toast.message = `Exported ${count} chats to ${resolveDest}`;
      } else {
        const chat = chats.find((c) => c.id === selectedChatId);
        if (!chat) throw new Error("Chat not found");

        const messages = await client.getMessages(
          Number(chat.id),
          includeMedia,
        );
        const filePath = await exportChat(
          chat,
          messages,
          resolveDest,
          format,
          includeMedia,
          mediaBasePath,
        );

        toast.style = Toast.Style.Success;
        toast.title = "Export Successful";
        toast.message = `Saved to ${path.basename(filePath)}`;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export Failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Export" onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Open Destination"
            url={`file://${destination}`}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="chat"
        title="Select Chat"
        value={selectedChatId}
        onChange={setSelectedChatId}
      >
        <Form.Dropdown.Item value="all" title="All Chats" icon="📚" />
        <Form.Dropdown.Section title="Specific Chats">
          {chats.map((chat) => (
            <Form.Dropdown.Item
              key={chat.id}
              value={chat.id}
              title={`${chat.name} (${new Date(chat.lastMessageDate).toLocaleDateString()})`}
              icon="💬"
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextField
        id="destination"
        title="Destination Folder"
        value={destination}
        onChange={setDestination}
        placeholder="/Users/username/Desktop/WhatsApp-Exports"
      />

      <Form.Dropdown
        id="format"
        title="Export Format"
        value={format}
        onChange={(v) => setFormat(v as ExportFormat)}
      >
        <Form.Dropdown.Item value="json" title="JSON" icon="💻" />
        <Form.Dropdown.Item value="markdown" title="Markdown" icon="📝" />
      </Form.Dropdown>

      <Form.Checkbox
        id="media"
        label="Include Media Files"
        value={includeMedia}
        onChange={setIncludeMedia}
        info="Copy media files (images, videos, documents) to export folder. Only files downloaded locally will be copied."
      />
    </Form>
  );
}
