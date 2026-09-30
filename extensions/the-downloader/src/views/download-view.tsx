import { useEffect, useState } from "react";
import os from "node:os";
import path from "node:path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Keyboard,
  open,
  openExtensionPreferences,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { HERO_W, downloadHeroSvg, heroFrameKey } from "../lib/charts.js";
import { DownloadSession, DownloadSnapshot, knownTotalBytes, useDownloadSession } from "../lib/download-session.js";
import { KIND_COLOR, KIND_ICON, canChat, hostOf, itemNoun, kindTitle, safeImageUrl } from "../lib/kinds.js";
import { formatBytes, formatClock, plural } from "../lib/format.js";
import { markdownImage } from "../lib/svg.js";
import { DownloadHistory, HISTORY_SHORTCUT } from "./history-view.js";
import { ChatAboutLinkAction } from "./chat-action.js";

function statusLabel(s: DownloadSnapshot): { text: string; icon: { source: Icon; tintColor: Color } } {
  switch (s.status) {
    case "done":
      return { text: s.resultTitle ?? "Downloaded", icon: { source: Icon.CheckCircle, tintColor: Color.Green } };
    case "failed":
      return { text: s.resultTitle ?? "Failed", icon: { source: Icon.XMarkCircle, tintColor: Color.Red } };
    case "cancelled":
      return { text: "Stopped", icon: { source: Icon.Stop, tintColor: Color.SecondaryText } };
    default: {
      const percent = s.percent !== undefined && s.stage !== "process" ? ` ${Math.floor(s.percent)}%` : "";
      const text =
        s.stage === "prepare"
          ? "Preparing…"
          : s.stage === "process"
            ? "Finishing…"
            : s.items > 0
              ? `Downloading · ${s.items}`
              : `Downloading${percent}`;
      return { text, icon: { source: Icon.CircleProgress, tintColor: Color.Blue } };
    }
  }
}

function tildify(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

/** A remote thumbnail sized to the hero's width. `raycast-width` is a query parameter, so merge it into an existing query. */
function thumbnailMarkdown(url: string, title: string): string {
  const safe = safeImageUrl(url);
  if (!safe) return "";
  const u = new URL(safe);
  u.searchParams.set("raycast-width", String(HERO_W));
  return `![${title.replace(/[[\]]/g, "")}](${u.toString().replace(/\(/g, "%28").replace(/\)/g, "%29")})`;
}

/**
 * Live view of one download: progress ring, stats, throughput chart and steps
 * on the left, everything known about the file on the right. Pushed by the
 * Download form on submit; Esc goes back to the form while the download keeps
 * running (its toast keeps reporting progress).
 */
export function DownloadView({ session }: { session: DownloadSession }) {
  const s = useDownloadSession(session);
  const { pop } = useNavigation();
  const [, setTick] = useState(0);
  const running = s.status === "running";

  // Re-render every second so the elapsed clock moves even when the tool is quiet
  // (preparing, monolith, transcripts).
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const clock = Date.now();
  const hero = markdownImage(downloadHeroSvg(s, clock), `download-${heroFrameKey(s, clock)}`, HERO_W);
  const thumbnail = s.meta?.thumbnail ? thumbnailMarkdown(s.meta.thumbnail, s.title ?? "Thumbnail") : "";
  const markdown = [hero, thumbnail].filter(Boolean).join("\n\n");

  const status = statusLabel(s);
  const total = knownTotalBytes(s);
  const filePath = s.filePath;
  const fileName = filePath ? path.basename(filePath) : undefined;
  const title = s.title ?? fileName ?? hostOf(s.url);

  return (
    <Detail
      navigationTitle={title}
      isLoading={running}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status.text} icon={status.icon} />
          {s.status === "failed" && s.resultMessage && <Detail.Metadata.Label title="Reason" text={s.resultMessage} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Title" text={title} />
          {s.meta?.uploader && <Detail.Metadata.Label title="Channel" text={s.meta.uploader} />}
          {s.meta?.duration ? <Detail.Metadata.Label title="Duration" text={formatClock(s.meta.duration)} /> : null}
          <Detail.Metadata.Label title="Source" text={s.meta?.source ?? hostOf(s.url)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item
              text={kindTitle(s.kind)}
              color={KIND_COLOR[s.kind]}
              icon={KIND_ICON[s.kind]}
            />
          </Detail.Metadata.TagList>
          {s.format && <Detail.Metadata.Label title="Format" text={s.format} />}
          {total !== undefined && <Detail.Metadata.Label title="Size" text={formatBytes(total)} />}
          {s.items > 0 && <Detail.Metadata.Label title="Saved" text={plural(s.items, itemNoun(s.kind))} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Folder" text={tildify(s.folder)} icon={Icon.Folder} />
          {fileName && <Detail.Metadata.Label title="File" text={fileName} icon={Icon.Document} />}
          <Detail.Metadata.Link title="Original" text={hostOf(s.url)} target={s.url} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {running && (
            <ActionPanel.Section>
              {/* Stop comes first (↵) so it's one key away and shown in the action bar; Esc goes back without stopping. */}
              {session.canStop && (
                <Action
                  title="Stop Download"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => session.stop()}
                />
              )}
              <Action title="Open Folder" icon={Icon.Folder} onAction={() => open(s.folder)} />
            </ActionPanel.Section>
          )}
          {s.status === "done" && (
            <ActionPanel.Section>
              {filePath ? (
                <>
                  <Action title="Open File" icon={Icon.Play} onAction={() => open(filePath)} />
                  <Action.ShowInFinder path={filePath} />
                  <Action
                    title="Copy File"
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    onAction={async () => {
                      await Clipboard.copy({ file: filePath });
                      await showHUD("Copied to Clipboard");
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={filePath}
                    shortcut={Keyboard.Shortcut.Common.CopyPath}
                  />
                </>
              ) : (
                <Action title="Open Folder" icon={Icon.Folder} onAction={() => open(s.folder)} />
              )}
            </ActionPanel.Section>
          )}
          {(s.status === "failed" || s.status === "cancelled") && (
            <ActionPanel.Section>
              <Action title="Back to Form" icon={Icon.ArrowLeft} onAction={pop} />
              {s.resultMessage && (
                <Action.CopyToClipboard
                  title="Copy Error"
                  content={s.resultMessage}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              )}
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {s.status === "done" && (
              <Action
                title="Download Another"
                icon={Icon.Download}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={pop}
              />
            )}
            <Action.Push
              title="Show Download History"
              icon={Icon.Clock}
              shortcut={HISTORY_SHORTCUT}
              target={<DownloadHistory />}
            />
            {canChat(s.kind) && <ChatAboutLinkAction url={s.url} />}
            <Action.OpenInBrowser title="Open Original" url={s.url} shortcut={Keyboard.Shortcut.Common.Open} />
            <Action.CopyToClipboard title="Copy Original URL" content={s.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
