import { Action, ActionPanel, Alert, Cache, Clipboard, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { deleteDraft, getDraft, getMediaStatus, updateDraft } from "../lib/api";
import { DRAFT_STATUS_LABELS, PLATFORM_LABELS, type DraftStatus } from "../lib/constants";
import type { DraftDetail, DraftListItem, MediaStatus } from "../lib/types";
import {
  formatRelativeDate,
  getDraftDate,
  getDraftDisplayTitle,
  getDraftSubtitle,
  getErrorMessage,
} from "../lib/utils";
import { CreateDraftForm } from "./create-draft";
import {
  formatScheduledDateTime,
  getDetailFullText,
  getDetailMediaIds,
  getDetailPosts,
  getEnabledPlatforms,
  getPublishedLinks,
  getTagColor,
} from "./drafts-helpers";

const draftDetailCache = new Cache({ namespace: "draft-details" });
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

const STATUS_ICONS: Record<DraftStatus, Icon> = {
  draft: Icon.Pencil,
  scheduled: Icon.Calendar,
  published: Icon.CheckCircle,
  publishing: Icon.Clock,
  error: Icon.Warning,
};

type DraftItemProps = {
  draft: DraftListItem;
  onRefresh: () => void;
  socialSetId?: string;
  hideStatus?: boolean;
  showScheduledTime?: boolean;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  tagNameMap: Map<string, string>;
};

export function DraftItem(props: DraftItemProps) {
  const { draft, onRefresh, socialSetId, hideStatus, showScheduledTime, isShowingDetail, onToggleDetail, tagNameMap } =
    props;
  const date = useMemo(() => getDraftDate(draft), [draft]);

  const accessories: List.Item.Accessory[] = (() => {
    const acc: List.Item.Accessory[] = [];
    if (!hideStatus && !isShowingDetail) {
      acc.push({
        text: DRAFT_STATUS_LABELS[draft.status],
        icon: STATUS_ICONS[draft.status],
      });
    }
    if (date) {
      if (isShowingDetail) {
        acc.push({
          text: formatRelativeDate(date),
          tooltip: date.toLocaleString(),
        });
      } else if (showScheduledTime && draft.status === "scheduled") {
        acc.push({
          text: formatScheduledDateTime(date),
          tooltip: date.toLocaleString(),
        });
      } else {
        acc.push({ date, tooltip: date.toLocaleString() });
      }
    }
    return acc;
  })();

  const keywords = [draft.status, ...draft.tags];

  const handleDelete = async () => {
    if (!socialSetId || !draft.id) {
      return;
    }
    const confirmed = await confirmAlert({
      title: "Delete Draft",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting draft",
    });
    try {
      await deleteDraft(Number(socialSetId), Number(draft.id));
      toast.style = Toast.Style.Success;
      toast.title = "Draft deleted";
      onRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete draft";
      toast.message = getErrorMessage(error);
    }
  };

  const handleCopyPublicUrl = async () => {
    if (draft.share_url) {
      await Clipboard.copy(draft.share_url);
      await showToast({
        style: Toast.Style.Success,
        title: "Public URL copied",
      });
      return;
    }
    if (!socialSetId || !draft.id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to share draft",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sharing draft",
    });
    try {
      const updatedDraft = await updateDraft(Number(socialSetId), Number(draft.id), { share: true });
      if (!updatedDraft.share_url) {
        throw new Error("Share URL not returned");
      }
      await Clipboard.copy(updatedDraft.share_url);
      toast.style = Toast.Style.Success;
      toast.title = "Public URL copied";
      onRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to share draft";
      toast.message = getErrorMessage(error);
    }
  };

  return (
    <List.Item
      title={getDraftDisplayTitle(draft)}
      subtitle={getDraftSubtitle(draft)}
      accessories={accessories}
      keywords={keywords}
      detail={<DraftDetailView draft={draft} socialSetId={socialSetId} date={date} tagNameMap={tagNameMap} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Draft" url={draft.private_url} />
            {draft.share_url ? <Action.OpenInBrowser title="Open Share URL" url={draft.share_url} /> : null}
            <Action.CopyToClipboard title="Copy Draft URL" content={draft.private_url} />
            <Action
              title={draft.share_url ? "Copy Public URL" : "Share Draft & Copy URL"}
              icon={Icon.Link}
              onAction={handleCopyPublicUrl}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Preview" : "Show Preview"}
              icon={Icon.Sidebar}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.Push
              title="Create Draft"
              icon={Icon.Pencil}
              target={<CreateDraftForm socialSetId={socialSetId} />}
            />
            <Action
              title="Delete Draft"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type DraftDetailViewProps = {
  draft: DraftListItem;
  socialSetId?: string;
  date?: Date;
  tagNameMap: Map<string, string>;
};

function DraftDetailView(props: DraftDetailViewProps) {
  const { draft, socialSetId, date, tagNameMap } = props;

  const cacheKey = socialSetId && draft.id ? `${socialSetId}-${draft.id}` : undefined;
  const cachedDetail = useMemo(() => {
    if (!cacheKey) return undefined;
    const cached = draftDetailCache.get(cacheKey);
    if (!cached) return undefined;
    try {
      const { data, timestamp } = JSON.parse(cached) as {
        data: DraftDetail;
        timestamp: number;
      };
      if (Date.now() - timestamp > CACHE_TTL_MS) {
        draftDetailCache.remove(cacheKey);
        return undefined;
      }
      return data;
    } catch {
      return undefined;
    }
  }, [cacheKey]);

  const { data: fetchedDetail, isLoading } = usePromise(
    async (setId?: string, draftId?: number | null) => {
      if (!setId || !draftId) return undefined;
      const result = await getDraft(Number(setId), draftId);
      if (result) {
        draftDetailCache.set(`${setId}-${draftId}`, JSON.stringify({ data: result, timestamp: Date.now() }));
      }
      return result;
    },
    [socialSetId, draft.id],
    { execute: Boolean(socialSetId && draft.id), onError: () => {} },
  );

  const detail = fetchedDetail || cachedDetail;

  const mediaIds = useMemo(() => getDetailMediaIds(detail), [detail]);

  const { data: mediaStatuses } = usePromise(
    async (setId?: string, ids?: string[]) => {
      if (!setId || !ids || ids.length === 0) return [];
      const mediaCacheKey = `media-${setId}-${ids.join(",")}`;
      const cachedMedia = draftDetailCache.get(mediaCacheKey);
      if (cachedMedia) {
        try {
          const { data, timestamp } = JSON.parse(cachedMedia) as {
            data: MediaStatus[];
            timestamp: number;
          };
          if (Date.now() - timestamp < CACHE_TTL_MS) return data;
        } catch {
          // ignore
        }
      }
      const results = await Promise.all(ids.map((id) => getMediaStatus(Number(setId), id).catch(() => undefined)));
      const valid = results.filter((r): r is MediaStatus => r !== undefined && r.status === "ready");
      draftDetailCache.set(mediaCacheKey, JSON.stringify({ data: valid, timestamp: Date.now() }));
      return valid;
    },
    [socialSetId, mediaIds],
    {
      execute: Boolean(socialSetId && mediaIds.length > 0),
      onError: () => {},
    },
  );

  const posts = getDetailPosts(detail);
  const fullText = getDetailFullText(detail);
  const charCount = fullText ? fullText.length : draft.preview?.length;
  const enabledPlatforms = getEnabledPlatforms(detail);
  const publishedLinks = getPublishedLinks(detail);

  const mediaByIdMap = useMemo(() => {
    const map = new Map<string, MediaStatus>();
    if (mediaStatuses) {
      for (const m of mediaStatuses) {
        map.set(m.media_id, m);
      }
    }
    return map;
  }, [mediaStatuses]);

  const markdown = useMemo(() => {
    if (!posts) return draft.preview || "No content";
    const sections = posts.map((post) => {
      let section = post.text;
      if (post.media_ids && post.media_ids.length > 0 && mediaByIdMap.size > 0) {
        const images = post.media_ids
          .map((id) => {
            const m = mediaByIdMap.get(id);
            if (!m) return null;
            if (m.mime.startsWith("video/")) {
              return "**\ud83c\udfac Video**";
            }
            if (m.mime === "application/pdf") {
              return "**\ud83d\udcc4 PDF**";
            }
            const url = m.media_urls?.medium || m.media_urls?.original;
            if (!url) return null;
            return `![${m.file_name}](${url})`;
          })
          .filter(Boolean);
        if (images.length > 0) {
          section += `\n\n${images.join("\n\n")}`;
        }
      }
      return section;
    });
    return sections.join("\n\n");
  }, [posts, draft.preview, mediaByIdMap]);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={DRAFT_STATUS_LABELS[draft.status]}
            icon={STATUS_ICONS[draft.status]}
          />
          {date ? (
            <List.Item.Detail.Metadata.Label
              title={draft.scheduled_date ? "Scheduled" : draft.published_at ? "Published" : "Updated"}
              text={formatRelativeDate(date)}
            />
          ) : null}
          {charCount ? <List.Item.Detail.Metadata.Label title="Characters" text={String(charCount)} /> : null}
          {enabledPlatforms.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Platforms">
              {enabledPlatforms.map((platform) => (
                <List.Item.Detail.Metadata.TagList.Item key={platform} text={PLATFORM_LABELS[platform]} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {publishedLinks.map(({ platform, url }) => (
            <List.Item.Detail.Metadata.Link
              key={platform}
              title={PLATFORM_LABELS[platform]}
              text="View post"
              target={url}
            />
          ))}
          {draft.share_url ? (
            <List.Item.Detail.Metadata.Link title="Shared" text="Public link" target={draft.share_url} />
          ) : null}
          {draft.tags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {draft.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={tag}
                  text={tagNameMap.get(tag) || tag}
                  color={getTagColor(tag)}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {detail?.scratchpad_text ? (
            <List.Item.Detail.Metadata.Label title="Notes" text={detail.scratchpad_text} />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
