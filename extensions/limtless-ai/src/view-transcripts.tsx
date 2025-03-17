import { List, ActionPanel, Action, showToast, Toast, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { LimitlessAPI } from "./utils/api";

interface LifelogContent {
  type: "heading1" | "heading2" | "blockquote";
  content: string;
  startTime?: string;
  endTime?: string;
  startOffsetMs?: number;
  endOffsetMs?: number;
  children?: LifelogContent[];
  speakerName?: string;
  speakerIdentifier?: "user" | null;
}

interface Lifelog {
  id: string;
  title: string;
  markdown: string;
  contents: LifelogContent[];
  createdAt?: string;
}

function getLifelogDate(lifelog: Lifelog): string {
  // Look for dates in content blocks (only in blockquote types that have startTime)
  const blockquotes = lifelog.contents.filter((content) => content.type === "blockquote" && content.startTime);

  // Use the first blockquote's startTime if available
  const dateStr = blockquotes.length > 0 ? blockquotes[0].startTime : null;

  if (!dateStr) return "No date available";

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid date";

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch (e) {
    return "Invalid date";
  }
}

function TranscriptDetail({ transcript }: { transcript: Lifelog }) {
  const formatContent = (contents: LifelogContent[]) => {
    return contents
      .map((content) => {
        if (content.content === transcript.title && content.type === "heading1") {
          return "";
        }

        switch (content.type) {
          case "heading1":
            return `# ${content.content}`;
          case "heading2":
            return `## ${content.content}`;
          case "blockquote":
            return `> ${content.content}`;
          default:
            return content.content;
        }
      })
      .filter((content) => content !== "")
      .join("\n\n");
  };

  const dateStr = getLifelogDate(transcript);
  const markdown = `# ${transcript.title}\n\n_${dateStr}_\n\n${formatContent(transcript.contents)}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={transcript.title}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Transcript"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Lifelog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const api = LimitlessAPI.getInstance();

  useEffect(() => {
    async function fetchTranscripts() {
      try {
        if (!api.hasApiKey()) {
          setError("Please set your Limitless API key in the extension preferences.");
          setIsLoading(false);
          return;
        }

        const response = await api.getLifelogs({
          limit: 20,
          direction: "desc",
          includeMarkdown: true,
          includeHeadings: true,
        });

        // Find a content with startTime for debugging
        const firstLifelog = response.data.lifelogs[0];
        const blockquote = firstLifelog?.contents?.find((c) => c.type === "blockquote" && c.startTime);
        console.log("First blockquote with startTime:", blockquote);

        setTranscripts(response.data.lifelogs);
        setNextCursor(response.meta.lifelogs.nextCursor);
        setHasMore(response.meta.lifelogs.count > response.data.lifelogs.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch transcripts");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTranscripts();
  }, []);

  const loadMore = async () => {
    if (!hasMore || !nextCursor) return;

    try {
      const response = await api.getLifelogs({
        cursor: nextCursor,
        limit: 20,
        direction: "desc",
        includeMarkdown: true,
        includeHeadings: true,
      });

      setTranscripts((prev) => [...prev, ...response.data.lifelogs]);
      setNextCursor(response.meta.lifelogs.nextCursor);
      setHasMore(response.meta.lifelogs.count > transcripts.length + response.data.lifelogs.length);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load more transcripts",
        message: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }
  };

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.Item
          title="Error"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Manage Api Key" url="raycast://extensions/limtless-ai/manage-api-key" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSelectionChange={(id) => {
        if (id === transcripts[transcripts.length - 1]?.id) {
          loadMore();
        }
      }}
    >
      {transcripts.map((transcript) => (
        <List.Item
          key={transcript.id}
          id={transcript.id}
          title={transcript.title}
          subtitle={getLifelogDate(transcript)}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<TranscriptDetail transcript={transcript} />} />
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={transcript.contents.map((content: LifelogContent) => content.content).join("\n\n")}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
