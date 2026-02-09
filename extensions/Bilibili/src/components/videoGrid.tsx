import { formatUrl, generateRemainderScript } from "../utils";

import { Action, ActionPanel, Color, Detail, Grid, Icon, showToast, Toast } from "@raycast/api";
import { ConclusionView } from "./conslusionView";
import { runAppleScript } from "run-applescript";

function escapeMarkdownText(content: string) {
  return content.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function getDetailCoverUrl(cover: string) {
  const normalizedUrl = formatUrl(cover);
  if (!normalizedUrl.includes("hdslb.com")) return normalizedUrl;

  // Use Bilibili image service params to enforce a 16:9 cropped cover in detail view.
  const [withoutQuery, query = ""] = normalizedUrl.split("?");
  const rawCover = withoutQuery.split("@")[0];
  const processedCover = `${rawCover}@960w_540h_1c.webp`;
  return query ? `${processedCover}?${query}` : processedCover;
}

function renderDetailMarkdown(cover: string, title: string, desc?: string) {
  const description = desc?.trim();
  const descriptionMarkdown = description ? `\n\n### Description\n\n${escapeMarkdownText(description)}` : "";
  return `![Cover](${getDetailCoverUrl(cover)})\n\n## ${escapeMarkdownText(title)}${descriptionMarkdown}`;
}

function formatRelativeTime(pubdate: number) {
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor(now / 1000) - pubdate);
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffSeconds < hour) return `${Math.max(1, Math.floor(diffSeconds / minute))}m ago`;
  if (diffSeconds < day) return `${Math.floor(diffSeconds / hour)}h ago`;
  if (diffSeconds < week) return `${Math.floor(diffSeconds / day)}d ago`;
  if (diffSeconds < month) return `${Math.floor(diffSeconds / week)}w ago`;
  if (diffSeconds < year) return `${Math.floor(diffSeconds / month)}mo ago`;
  return `${Math.floor(diffSeconds / year)}y ago`;
}

function buildSubtitle(props: { view?: string; pubdate: number; duration: string }) {
  const parts = [
    props.view ? `${props.view} views` : "",
    formatRelativeTime(props.pubdate),
    props.duration || "",
  ].filter(Boolean);

  return parts.join(" · ");
}

export function VideoGridItem(props: {
  id: string;
  title: string;
  cover: string;
  desc?: string;
  url: string;
  uploader: Bilibili.Uploader;
  bvid: string;
  cid?: number;
  duration: string;
  pubdate: number;
  stat: {
    highlight?: string;
    view?: string;
    danmaku?: string;
    like?: string;
    coin?: string;
  };
}) {
  async function addWatchLaterReminder() {
    try {
      await runAppleScript(generateRemainderScript(props.title, props.uploader.name, props.url));
      await showToast({ style: Toast.Style.Success, title: "Reminder added" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Reminder failed to add" });
    }
  }

  return (
    <Grid.Item
      id={props.id}
      content={formatUrl(props.cover)}
      title={props.title}
      subtitle={buildSubtitle({
        view: props.stat.view,
        pubdate: props.pubdate,
        duration: props.duration,
      })}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={
              <Detail
                navigationTitle={props.title}
                markdown={renderDetailMarkdown(props.cover, props.title, props.desc)}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Video" url={formatUrl(props.url)} />
                    <Action.CopyToClipboard title="Copy Video URL" content={formatUrl(props.url)} />
                    <Action.Push
                      icon={Icon.QuoteBlock}
                      title="AI Summary"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      target={<ConclusionView bvid={props.bvid} cid={props.cid || 0} up_mid={props.uploader.mid} />}
                    />
                    <Action.OpenInBrowser
                      title={`Open ${props.uploader.name} Dynamic`}
                      url={`https://space.bilibili.com/${props.uploader.mid}/dynamic`}
                    />
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Uploader"
                      text={props.uploader.name}
                      icon={formatUrl(props.uploader.face)}
                    />
                    <Detail.Metadata.Label title="Duration" text={props.duration} />
                    <Detail.Metadata.Label title="Time" text={new Date(props.pubdate * 1000).toLocaleString()} />
                    <Detail.Metadata.TagList title="Stat">
                      {props.stat.highlight && (
                        <Detail.Metadata.TagList.Item text={props.stat.highlight} color={"#FB7299"} />
                      )}
                      {props.stat.view && (
                        <Detail.Metadata.TagList.Item text={`Play: ${props.stat.view}`} color={Color.Green} />
                      )}
                      {props.stat.coin && (
                        <Detail.Metadata.TagList.Item text={`Coin: ${props.stat.coin}`} color={Color.Orange} />
                      )}
                      {props.stat.view && (
                        <Detail.Metadata.TagList.Item text={`View: ${props.stat.view}`} color={Color.Purple} />
                      )}
                      {props.stat.danmaku && (
                        <Detail.Metadata.TagList.Item text={`Danmaku: ${props.stat.danmaku}`} color={Color.Blue} />
                      )}
                    </Detail.Metadata.TagList>
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.OpenInBrowser title="Open Video" url={formatUrl(props.url)} />
          <Action.Push
            icon={Icon.QuoteBlock}
            title="AI Summary"
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            target={<ConclusionView bvid={props.bvid} cid={props.cid || 0} up_mid={props.uploader.mid} />}
          />
          <Action
            title="Add reminder to watch later"
            onAction={addWatchLaterReminder}
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.OpenInBrowser
            title={`Open ${props.uploader.name} Dynamic`}
            url={`https://space.bilibili.com/${props.uploader.mid}/dynamic`}
          />
        </ActionPanel>
      }
    />
  );
}
