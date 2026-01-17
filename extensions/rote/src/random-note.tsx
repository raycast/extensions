import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  getPreferenceValues,
} from "@raycast/api";
import type { Preferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getApiClient } from "./api";
import { Note } from "./types";

// Random note - metadata at bottom

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateMarkdown(note: Note): string {
  let markdown = "";

  // Content first
  markdown += note.content;

  // Then show attachments/images
  if (note.attachments && note.attachments.length > 0) {
    const images = note.attachments.filter((a) =>
      a.details?.mimetype?.startsWith("image/"),
    );
    if (images.length > 0) {
      markdown += "\n\n";
      for (const attachment of images) {
        const imageUrl = attachment.compressUrl || attachment.url;
        if (imageUrl) {
          markdown += `![](${imageUrl})\n\n`;
        }
      }
    }
  }

  // Metadata at bottom
  markdown += "\n\n---\n\n";

  const stateText = note.state === "public" ? "🌍 Public" : "🔒 Private";
  const parts: string[] = [];
  parts.push(`\`${stateText}\``);
  parts.push(`\`${formatDate(note.createdAt)}\``);

  if (note.tags && note.tags.length > 0) {
    parts.push(note.tags.map((t) => `\`#${t}\``).join(" "));
  }

  markdown += parts.join("  ");

  return markdown;
}

export default function RandomNote() {
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const preferences = getPreferenceValues<Preferences>();
  const webUrl =
    (preferences.webUrl as unknown as string | undefined)?.replace(/\/$/, "") ||
    "";

  async function fetchRandomNote() {
    setIsLoading(true);
    setError(null);
    setIsEmpty(false);

    const api = getApiClient();

    if (!api.isConfigured()) {
      setError("Please configure username and password");
      setIsLoading(false);
      return;
    }

    try {
      const randomNote = await api.getRandomNote();

      if (!randomNote) {
        setIsEmpty(true);
        setNote(null);
      } else {
        setNote(randomNote);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRandomNote();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={fetchRandomNote}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isEmpty) {
    return (
      <Detail
        markdown={`# 📭 No Notes\n\nGo write something!`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={fetchRandomNote}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!note) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={generateMarkdown(note)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Another Random Note"
              icon={Icon.Shuffle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={fetchRandomNote}
            />
            {webUrl && (
              <Action.OpenInBrowser
                title="Open in Browser"
                url={`${webUrl}/rote/${note.id}`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Content"
              content={note.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Paste
              title="Paste Content"
              content={note.content}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
            {webUrl && (
              <Action.CopyToClipboard
                title="Copy Link"
                content={`${webUrl}/note/${note.id}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
