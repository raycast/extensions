import { Form, ActionPanel, Action, showHUD, popToRoot, showToast, Toast, List } from "@raycast/api";
import { FileService, CONFIG } from "./utils";
import type { CapturedData } from "./utils";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { useState, useEffect, useCallback } from "react";

interface FormValues {
  comment: string;
}

interface CaptureFile {
  path: string;
  data: CapturedData;
  timestamp: Date;
}

function CaptureDetail({ data }: { data: CapturedData }) {
  const markdown = `
${data.content.text ? `${data.content.text}\n\n` : "No content captured\n\n"}
${data.content.screenshot ? `![Screenshot](${data.content.screenshot})\n` : ""}
`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Timestamp"
            text={new Date(data.metadata.timestamp).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Source" text={data.source.app || "Unknown"} />
          <List.Item.Detail.Metadata.Label title="Bundle ID" text={data.source.bundleId || "None"} />

          {data.source.url && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="URL" target={data.source.url} text={data.source.url} />
            </>
          )}

          {data.metadata.comment && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Comment" text={data.metadata.comment} />
            </>
          )}

          {data.content.html && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="HTML Preview" text={`${data.content.html.slice(0, 200)}...`} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function CommentForm({ capture, onCommentSaved }: { capture: CaptureFile; onCommentSaved?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const updatedData = {
        ...capture.data,
        metadata: {
          ...capture.data.metadata,
          comment: values.comment,
        },
      };
      await FileService.saveJSON(capture.path, updatedData);
      await showHUD("✓ Added comment");
      onCommentSaved?.();
      await popToRoot();
    } catch (error) {
      console.error("Failed to save comment:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Comment",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Comment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Add any notes about this capture..."
        defaultValue={capture.data.metadata.comment}
        enableMarkdown
      />
      <Form.Description
        title="Capture Info"
        text={`${capture.data.source.app} - ${new Date(capture.data.metadata.timestamp).toLocaleString()}`}
      />
    </Form>
  );
}

export default function Command() {
  const [captures, setCaptures] = useState<CaptureFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCaptures = useCallback(async () => {
    try {
      await FileService.ensureDirectory(CONFIG.saveDir);
      const files = await fs.readdir(CONFIG.saveDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const captureFiles: CaptureFile[] = [];
      for (const file of jsonFiles) {
        const filePath = path.join(CONFIG.saveDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content) as CapturedData;
        captureFiles.push({
          path: filePath,
          data,
          timestamp: new Date(data.metadata.timestamp),
        });
      }

      // Sort by timestamp, newest first
      captureFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setCaptures(captureFiles);
    } catch (error) {
      console.error("Failed to load captures:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Captures",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptures();
  }, [loadCaptures]);

  if (captures.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          title="No captures found"
          description="Capture something first using the Quick Capture command"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search captures..." isShowingDetail>
      {captures.map((capture) => {
        const date = new Date(capture.data.metadata.timestamp);
        const timeString = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateString = date.toLocaleDateString([], { month: "short", day: "numeric" });

        const icon = capture.data.content.html ? "🌐" : "🗒️";

        return (
          <List.Item
            key={capture.path}
            icon={icon}
            title={`${timeString} - ${capture.data.source.app || "Unknown"}`}
            subtitle={capture.data.content.text?.slice(0, 50)}
            accessories={[{ text: dateString }, ...(capture.data.metadata.comment ? [{ icon: "💭" }] : [])]}
            detail={<CaptureDetail data={capture.data} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add or Edit Comment"
                  target={<CommentForm capture={capture} onCommentSaved={loadCaptures} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                {capture.data.source.url && (
                  <Action.OpenInBrowser
                    title="Open URL"
                    url={capture.data.source.url}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                )}
                {capture.data.content.screenshot && (
                  <Action.Open
                    title="Open Screenshot"
                    target={capture.data.content.screenshot}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
