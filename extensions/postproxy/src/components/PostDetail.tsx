import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { Fragment, useState } from "react";
import { supportsComments } from "../lib/comments";
import { useProfiles } from "../lib/hooks";
import { api, APP_URL, authHeaders, deletePost, publishDraft } from "../lib/postproxy";
import { formatDate, formatNumber, humanizeKey } from "../lib/format";
import { ANALYTICS_PERIODS, impressionsOf, latestStatsByPlatform, periodFromIso, periodLabel } from "../lib/stats";
import { platformIcon, platformLabel } from "../lib/platforms";
import type { MediaAttachment, PlatformOutcome, Post, PostStatsResponse } from "../lib/types";
import { CommentsView } from "./CommentsView";

const OUTCOME_COLOR: Record<string, Color> = {
  published: Color.Green,
  processing: Color.Blue,
  pending: Color.Yellow,
  failed: Color.Red,
  deleted: Color.SecondaryText,
};

function isImage(media: MediaAttachment): boolean {
  return (media.content_type ?? "").startsWith("image/");
}

function mediaUrl(media: MediaAttachment): string {
  return media.url ?? media.source_url ?? "";
}

function mediaKind(media: MediaAttachment): string {
  return (media.content_type ?? "media").split("/")[0];
}

function metricsMarkdown(stats: Record<string, number>): string {
  const entries = Object.entries(stats);
  if (entries.length === 0) return "_No data yet._";
  return entries.map(([key, value]) => `- ${humanizeKey(key)}: **${formatNumber(value)}**`).join("\n");
}

function postMarkdown(post: Post): string {
  return ["### Post", "", post.body ?? post.content ?? "_(no text)_"].join("\n");
}

function mediaMarkdown(media: MediaAttachment, index: number): string {
  const url = mediaUrl(media);
  if (isImage(media) && url) return `![media ${index + 1}](${url})`;
  return [
    `**${humanizeKey(mediaKind(media))} ${index + 1}**`,
    "",
    media.content_type ?? "",
    "",
    url ? `[Open media](${url})` : "_No preview available._",
  ].join("\n");
}

function outcomeMarkdown(outcome: PlatformOutcome, stats?: Record<string, number>): string {
  const lines = [`### ${platformLabel(outcome.platform)}`, "", `**Status:** ${outcome.status}`];
  if (outcome.attempted_at) lines.push(`**Attempted:** ${formatDate(outcome.attempted_at)}`);
  if (outcome.error) lines.push("", `**Error:** ${outcome.error}`);
  const link = outcome.permalink ?? outcome.url;
  if (link) lines.push("", `[Open on platform](${link})`);
  if (stats && Object.keys(stats).length > 0) lines.push("", "**Insights**", metricsMarkdown(stats));
  return lines.join("\n");
}

export function PostDetail({ post, onChange }: { post: Post; onChange?: () => void }) {
  const { data: profiles } = useProfiles();
  const { pop } = useNavigation();

  // Full post (list items can be compact and omit media / insights).
  const { data: full } = useFetch(api(`/posts/${post.id}`), {
    headers: authHeaders(),
    initialData: post,
    keepPreviousData: true,
  });
  const current = (full ?? post) as Post;

  // Detailed per-platform analytics, filtered by the selected period.
  const [period, setPeriod] = useState("all");
  const fromIso = periodFromIso(period);
  const { data: statsResponse, isLoading: loadingStats } = useFetch<PostStatsResponse>(
    api(`/posts/stats?post_ids=${post.id}${fromIso ? `&from=${encodeURIComponent(fromIso)}` : ""}`),
    { headers: authHeaders(), keepPreviousData: true },
  );
  const statPlatforms = statsResponse?.data?.[post.id]?.platforms ?? [];
  const latestByPlatform = latestStatsByPlatform(statsResponse, post.id);
  const total = [...latestByPlatform.values()].reduce((sum, stats) => sum + impressionsOf(stats), 0);

  const profilesForPlatform = (platform: string) =>
    profiles.filter((profile) => profile.platform.toLowerCase() === platform.toLowerCase());

  async function withToast(pending: string, done: string, action: () => Promise<unknown>) {
    const toast = await showToast({ style: Toast.Style.Animated, title: pending });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = done;
      onChange?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: `${pending} failed` });
    }
  }

  return (
    <List
      navigationTitle="Post"
      isShowingDetail
      searchBarPlaceholder="Search platforms…"
      searchBarAccessory={
        <List.Dropdown tooltip="Analytics period" value={period} onChange={setPeriod}>
          {ANALYTICS_PERIODS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Content">
        <List.Item
          icon={post.draft ? Icon.Pencil : Icon.Document}
          title={(post.body ?? post.content ?? "(no text)").replace(/\s+/g, " ").slice(0, 80)}
          accessories={[{ tag: post.status }]}
          detail={
            <List.Item.Detail
              markdown={postMarkdown(current)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Status" text={current.status} />
                  <List.Item.Detail.Metadata.Label title="Draft" text={current.draft ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="Impressions" text={formatNumber(total)} />
                  <List.Item.Detail.Metadata.Label title="Created" text={formatDate(current.created_at)} />
                  {current.scheduled_at ? (
                    <List.Item.Detail.Metadata.Label title="Scheduled" text={formatDate(current.scheduled_at)} />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {post.draft ? (
                <Action
                  title="Publish Now"
                  icon={Icon.Upload}
                  onAction={() => withToast("Publishing", "Publishing", () => publishDraft(post.id))}
                />
              ) : null}
              <Action.OpenInBrowser title="Open Post on Postproxy" url={`${APP_URL}/posts/${post.id}`} />
              <Action
                title="Delete Post"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const ok = await confirmAlert({ title: "Delete this post?", message: "This cannot be undone." });
                  if (ok) withToast("Deleting", "Deleted", () => deletePost(post.id));
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {current.media && current.media.length > 0 ? (
        <List.Section title="Media">
          {current.media.map((media, index) => {
            const url = mediaUrl(media);
            return (
              <List.Item
                key={media.id}
                icon={isImage(media) && url ? { source: url } : Icon.Video}
                title={`${isImage(media) ? "Image" : humanizeKey(mediaKind(media))} ${index + 1}`}
                subtitle={media.content_type ?? undefined}
                detail={<List.Item.Detail markdown={mediaMarkdown(media, index)} />}
                actions={
                  <ActionPanel>
                    {url ? <Action.OpenInBrowser title="Open Media" icon={Icon.Image} url={url} /> : null}
                    {url ? <Action.CopyToClipboard title="Copy Media URL" content={url} /> : null}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}

      <List.Section title="Performance">
        <List.Item
          icon={Icon.LineChart}
          title="Performance Insights"
          accessories={[{ text: `${formatNumber(total)} impressions` }]}
          detail={
            <List.Item.Detail
              isLoading={loadingStats}
              markdown="# Performance Insights"
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Total Impressions"
                    icon={Icon.LineChart}
                    text={formatNumber(total)}
                  />
                  <List.Item.Detail.Metadata.Label title="Period" icon={Icon.Calendar} text={periodLabel(period)} />
                  {statPlatforms.length === 0 ? (
                    <List.Item.Detail.Metadata.Label
                      title="Analytics"
                      text={loadingStats ? "Loading…" : "No data yet"}
                    />
                  ) : (
                    statPlatforms.map((sp) => {
                      const entries = Object.entries(sp.records.at(-1)?.stats ?? {});
                      return (
                        <Fragment key={sp.platform}>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title={platformLabel(sp.platform)}
                            icon={platformIcon(sp.platform)}
                          />
                          {entries.length > 0 ? (
                            entries.map(([key, value]) => (
                              <List.Item.Detail.Metadata.Label
                                key={key}
                                title={humanizeKey(key)}
                                text={formatNumber(value)}
                              />
                            ))
                          ) : (
                            <List.Item.Detail.Metadata.Label title="Stats" text="No data yet" />
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Analytics on Postproxy"
                icon={Icon.LineChart}
                url={`${APP_URL}/posts/${post.id}`}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Platforms">
        {current.platforms.map((outcome, index) => {
          const candidates = supportsComments(outcome.platform) ? profilesForPlatform(outcome.platform) : [];
          const stats = latestByPlatform.get(outcome.platform.toLowerCase());
          return (
            <List.Item
              key={`${outcome.platform}-${index}`}
              icon={platformIcon(outcome.platform)}
              title={platformLabel(outcome.platform)}
              subtitle={outcome.error ?? undefined}
              accessories={[
                ...(stats ? [{ text: `${formatNumber(impressionsOf(stats))} impr.` }] : []),
                { tag: { value: outcome.status, color: OUTCOME_COLOR[outcome.status] ?? Color.PrimaryText } },
              ]}
              detail={<List.Item.Detail markdown={outcomeMarkdown(outcome, stats)} />}
              actions={
                <ActionPanel>
                  {candidates.length === 1 ? (
                    <Action.Push
                      title="View Comments"
                      icon={Icon.Bubble}
                      target={<CommentsView postId={post.id} profileId={candidates[0].id} />}
                    />
                  ) : candidates.length > 1 ? (
                    <ActionPanel.Submenu title="View Comments" icon={Icon.Bubble}>
                      {candidates.map((profile) => (
                        <Action.Push
                          key={profile.id}
                          title={profile.name}
                          icon={Icon.Person}
                          target={<CommentsView postId={post.id} profileId={profile.id} />}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  ) : null}
                  {(outcome.permalink ?? outcome.url) ? (
                    <Action.OpenInBrowser
                      title="Open Post on Platform"
                      url={(outcome.permalink ?? outcome.url) as string}
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
