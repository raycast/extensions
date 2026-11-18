import { Action, ActionPanel, Clipboard, Color, Icon, Keyboard, List, open, showHUD } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { LoadErrorView } from "./components/load-error-view";
import { api } from "./lib/api";
import { runWithToast } from "./lib/feedback";
import {
  formatDate,
  MENTION_STATUS_LABELS,
  mentionMarkdown,
  mentionTitle,
  SOURCE_LABELS,
  websiteName,
} from "./lib/format";
import { Mention, MentionSort, MentionStatus } from "./lib/types";
import { useWebsites } from "./lib/use-websites";

type StatusFilter = MentionStatus | "ALL";

const ALL_WEBSITES = "all";
const PAGE_SIZE = 50;
const STRONG_SCORE = 80;
const MEDIUM_SCORE = 50;

const MENTION_STATUSES: MentionStatus[] = ["NEW", "APPROVED", "REJECTED"];

const STATUS_ICONS: Record<MentionStatus, Icon> = {
  NEW: Icon.Circle,
  APPROVED: Icon.CheckCircle,
  REJECTED: Icon.XMarkCircle,
};

const STATUS_ACTION_TITLES: Record<MentionStatus, string> = {
  NEW: "Move Back to New",
  APPROVED: "Approve Mention",
  REJECTED: "Reject Mention",
};

function scoreColor(score: number): Color {
  if (score >= STRONG_SCORE) return Color.Green;
  if (score >= MEDIUM_SCORE) return Color.Yellow;
  return Color.SecondaryText;
}

const scoreAccessory = (mention: Mention): List.Item.Accessory[] =>
  typeof mention.relevanceScore === "number"
    ? [
        {
          tag: { value: String(Math.round(mention.relevanceScore)), color: scoreColor(mention.relevanceScore) },
          tooltip: "Relevance Score",
        },
      ]
    : [];

function MentionDetail({ mention }: { mention: Mention }) {
  return (
    <List.Item.Detail
      markdown={mentionMarkdown(mention)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={MENTION_STATUS_LABELS[mention.status]} />
          <List.Item.Detail.Metadata.Label title="Source" text={SOURCE_LABELS[mention.source]} />
          {typeof mention.relevanceScore === "number" && (
            <List.Item.Detail.Metadata.Label title="Score" text={String(Math.round(mention.relevanceScore))} />
          )}
          {mention.keyword && <List.Item.Detail.Metadata.Label title="Keyword" text={mention.keyword} />}
          {mention.subreddit && <List.Item.Detail.Metadata.Label title="Community" text={mention.subreddit} />}
          {mention.author && <List.Item.Detail.Metadata.Label title="Author" text={mention.author} />}
          {mention.publishedAt && (
            <List.Item.Detail.Metadata.Label title="Published" text={formatDate(mention.publishedAt)} />
          )}
          {mention.url && <List.Item.Detail.Metadata.Link title="Link" text="Open" target={mention.url} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

async function copyReplyAndOpen(reply: string, url: string) {
  try {
    await Clipboard.copy(reply);
    await open(url);
    await showHUD("Reply Copied");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Conversation" });
  }
}

export default function Command() {
  const [status, setStatus] = useState<StatusFilter>("NEW");
  const [websiteId, setWebsiteId] = useCachedState("website-filter", ALL_WEBSITES);
  const [sort, setSort] = useCachedState<MentionSort>("mention-sort", "RELEVANCE");
  const { data: websites } = useWebsites();

  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (statusFilter: StatusFilter, selectedWebsiteId: string, selectedSort: MentionSort) =>
      async ({ page }: { page: number }) => {
        const offset = page * PAGE_SIZE;
        const result = await api().listMentions({
          websiteId: selectedWebsiteId === ALL_WEBSITES ? undefined : selectedWebsiteId,
          statuses: statusFilter === "ALL" ? undefined : [statusFilter],
          sort: selectedSort,
          limit: PAGE_SIZE,
          offset,
        });
        return { data: result.mentions, hasMore: offset + result.mentions.length < result.total };
      },
    [status, websiteId, sort],
    { keepPreviousData: true, failureToastOptions: { title: "Could Not Load Mentions" } },
  );

  const selectedWebsite = websites?.find((website) => website.id === websiteId);

  const updateStatus = async (mention: Mention, nextStatus: MentionStatus) => {
    const label = MENTION_STATUS_LABELS[nextStatus];
    await runWithToast(
      { pending: "Updating Mention", success: `Marked ${label}`, failure: "Could Not Update Mention" },
      () => api().updateMentionStatus(mention.id, nextStatus),
    );
    revalidate();
  };

  const generateReply = async (mention: Mention) => {
    await runWithToast(
      { pending: "Generating Reply", success: "Reply Ready", failure: "Could Not Generate Reply" },
      async () => {
        const explained = await api().explainMention(mention.id);
        if (!explained.aiReplySuggestion) {
          throw new Error("RedReplier returned no reply. Check that the website has a description.");
        }
      },
    );
    revalidate();
  };

  const viewActions = (
    <ActionPanel.Section title="View">
      <ActionPanel.Submenu title="Filter by Website" icon={Icon.Globe}>
        <Action title="All Websites" icon={Icon.Globe} onAction={() => setWebsiteId(ALL_WEBSITES)} />
        {websites?.map((website) => (
          <Action
            key={website.id}
            title={websiteName(website)}
            icon={Icon.Globe}
            onAction={() => setWebsiteId(website.id)}
          />
        ))}
      </ActionPanel.Submenu>
      <Action
        title={sort === "RELEVANCE" ? "Sort by Newest" : "Sort by Relevance"}
        icon={Icon.ArrowUp}
        onAction={() => setSort(sort === "RELEVANCE" ? "RECENT" : "RELEVANCE")}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={(data?.length ?? 0) > 0}
      pagination={pagination}
      searchBarPlaceholder={
        selectedWebsite ? `Search loaded mentions for ${websiteName(selectedWebsite)}` : "Search loaded mentions"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Status" defaultValue="NEW" onChange={(value) => setStatus(value as StatusFilter)}>
          {MENTION_STATUSES.map((value) => (
            <List.Dropdown.Item key={value} title={MENTION_STATUS_LABELS[value]} value={value} />
          ))}
          <List.Dropdown.Item title="All Mentions" value="ALL" />
        </List.Dropdown>
      }
    >
      {error && !data?.length ? (
        <LoadErrorView title="Could Not Load Mentions" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="No Mentions Found"
          actions={<ActionPanel>{viewActions}</ActionPanel>}
        />
      )}
      {data?.map((mention) => (
        <List.Item
          key={mention.id}
          title={mentionTitle(mention)}
          icon={STATUS_ICONS[mention.status]}
          keywords={[
            SOURCE_LABELS[mention.source],
            mention.keyword ?? "",
            mention.subreddit ?? "",
            mention.author ?? "",
            ...(mention.contentText?.split(/\s+/).slice(0, 80) ?? []),
          ]}
          accessories={scoreAccessory(mention)}
          detail={<MentionDetail mention={mention} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {mention.url && mention.aiReplySuggestion && (
                  <Action
                    title="Copy Reply and Open Conversation"
                    icon={Icon.Reply}
                    onAction={() => copyReplyAndOpen(mention.aiReplySuggestion ?? "", mention.url ?? "")}
                  />
                )}
                {mention.url && <Action.OpenInBrowser title="Open Conversation" url={mention.url} />}
                {mention.aiReplySuggestion && (
                  <Action.CopyToClipboard title="Copy Suggested Reply" content={mention.aiReplySuggestion} />
                )}
                <Action.CopyToClipboard title="Copy Mention" content={mentionMarkdown(mention)} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Review">
                {!mention.aiReplySuggestion && (
                  <Action title="Generate Reply" icon={Icon.Stars} onAction={() => generateReply(mention)} />
                )}
                {MENTION_STATUSES.filter((nextStatus) => nextStatus !== mention.status).map((nextStatus) => (
                  <Action
                    key={nextStatus}
                    title={STATUS_ACTION_TITLES[nextStatus]}
                    icon={STATUS_ICONS[nextStatus]}
                    onAction={() => updateStatus(mention, nextStatus)}
                  />
                ))}
              </ActionPanel.Section>
              {viewActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
