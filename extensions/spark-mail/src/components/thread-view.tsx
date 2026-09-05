import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  open,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSparkPath,
  parseAttachments,
  parseRecords,
  cleanLink,
  type ParsedRecord,
} from "../lib/spark";
import { senderName, toRelative } from "../lib/format";

export function ThreadView(props: { id: string; subject?: string }) {
  const { id, subject } = props;
  const [withAttachments, setWithAttachments] = useState(false);
  const downloadToast = useRef<Toast | null>(null);

  const args = withAttachments
    ? ["thread", "--download-attachments", id]
    : ["thread", id];
  const { data, isLoading, error, revalidate } = useExec(getSparkPath(), args, {
    keepPreviousData: true,
  });

  // A thread-load error: only surface it directly when we aren't mid-download
  // (the download effect below owns the toast in that case, to avoid stacking).
  if (error && !downloadToast.current) {
    showFailureToast(error, { title: "Couldn't load thread" });
  }

  const { summary, records } = useMemo(
    () => (data ? parseRecords(data) : { summary: {}, records: [] }),
    [data],
  );
  const attachments = useMemo(
    () => (data ? parseAttachments(data) : []),
    [data],
  );
  const downloaded = attachments.filter((a) => a.path);

  // Resolve the "Downloading…" toast once the attachment-enabled refetch settles.
  useEffect(() => {
    const toast = downloadToast.current;
    if (!toast || isLoading) return;
    if (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't download attachments";
    } else if (downloaded.length > 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Downloaded ${downloaded.length} attachment${downloaded.length > 1 ? "s" : ""}`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No attachments were downloaded";
    }
    downloadToast.current = null;
  }, [isLoading, error, downloaded.length]);

  const link = cleanLink(summary.link);
  const title = subject ?? summary.thread ?? summary.subject;
  const markdown = useMemo(
    () => renderThread(records, title),
    [records, title],
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title ?? "Thread"}
      markdown={
        markdown || (isLoading ? "" : "_No messages found in this thread._")
      }
      metadata={
        <Detail.Metadata>
          {title ? (
            <Detail.Metadata.Label title="Subject" text={title} />
          ) : null}
          {summary.labels ? (
            <Detail.Metadata.Label title="Labels" text={summary.labels} />
          ) : null}
          <Detail.Metadata.Label
            title="Messages"
            text={summary.messages ?? String(records.length)}
          />
          {attachments.length ? (
            <Detail.Metadata.Label
              title="Attachments"
              text={String(attachments.length)}
              icon={Icon.Paperclip}
            />
          ) : null}
          {link ? (
            <Detail.Metadata.Link
              title="Open in Spark"
              target={link}
              text="Spark"
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {link ? (
              <Action
                title="Open in Spark"
                icon={Icon.AppWindow}
                onAction={() => open(link)}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Thread Text"
              content={data ?? ""}
            />
          </ActionPanel.Section>
          {attachments.length ? (
            <ActionPanel.Section title="Attachments">
              {downloaded.length === 0 ? (
                <Action
                  title={`Download ${attachments.length} Attachment${attachments.length > 1 ? "s" : ""}`}
                  icon={Icon.Download}
                  onAction={async () => {
                    downloadToast.current = await showToast({
                      style: Toast.Style.Animated,
                      title: "Downloading attachments…",
                    });
                    if (withAttachments) {
                      // A previous download attempt failed: the flag is already set, so
                      // flipping state again would not re-run the request — revalidate instead.
                      revalidate();
                    } else {
                      setWithAttachments(true);
                    }
                  }}
                />
              ) : (
                downloaded.map((a, i) => (
                  <Action
                    key={`${a.path}-${i}`}
                    title={`Open ${a.name}`}
                    icon={Icon.Paperclip}
                    onAction={() => open(a.path as string)}
                  />
                ))
              )}
              {downloaded.length ? (
                <Action
                  title="Show Attachments in Finder"
                  icon={Icon.Finder}
                  onAction={() => showInFinder(downloaded[0].path as string)}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

/**
 * Neutralize Markdown image syntax in untrusted email content. A sender could
 * embed `![x](https://attacker.example/pixel)` and the Detail renderer would
 * fetch the remote image when the thread is viewed, leaking that (and when)
 * the mail was read. Escaping the bracket keeps the text visible but inert.
 */
function neutralizeRemoteImages(text: string): string {
  return text.replaceAll("![", String.raw`!\[`);
}

function renderThread(records: ParsedRecord[], subject?: string): string {
  if (!records.length) return "";
  const parts: string[] = [];
  if (subject) parts.push(`# ${neutralizeRemoteImages(subject)}\n`);
  for (const rec of records) {
    const h = rec.headers;
    const who = neutralizeRemoteImages(
      senderName(h.from ?? h.sender ?? "Unknown"),
    );
    // toRelativeは不正な日付ヘッダーを原文のまま返すため、ここも送信者制御の文字列として扱う
    const when = h.date ? neutralizeRemoteImages(toRelative(h.date)) : "";
    const header = [`**${who}**`, when && `· ${when}`]
      .filter(Boolean)
      .join(" ");
    parts.push(
      `---\n\n${header}\n\n${neutralizeRemoteImages(rec.body) || "_(no content)_"}`,
    );
  }
  return parts.join("\n\n");
}
