import { Action, ActionPanel, Alert, Clipboard, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { deleteDraft, getParsedPostContent } from "../lib/api";
import { DRAFT_STATUS_LABELS, getPlatformLabel, type DraftStatus } from "../lib/constants";
import type { DraftListItem } from "../lib/types";
import {
  formatRelativeDate,
  getDraftDate,
  getDraftDisplayTitle,
  getDraftSubtitle,
  getErrorMessage,
} from "../lib/utils";
import { CreateDraftForm } from "./create-draft";
import { formatScheduledDateTime, getTagColor } from "./drafts-helpers";

const STATUS_ICONS: Record<DraftStatus, Icon> = {
  draft: Icon.Pencil,
  scheduled: Icon.Calendar,
  published: Icon.CheckCircle,
  publishing: Icon.Clock,
  error: Icon.ExclamationMark,
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
    if (!draft.share_url) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Public URL unavailable",
        message: "Share the draft in Postey before copying the public link.",
      });
      return;
    }
    await Clipboard.copy(draft.share_url);
    await showToast({
      style: Toast.Style.Success,
      title: "Public URL copied",
    });
  };

  return (
    <List.Item
      title={getDraftDisplayTitle(draft)}
      subtitle={getDraftSubtitle(draft)}
      accessories={accessories}
      keywords={keywords}
      detail={<DraftDetailView draft={draft} date={date} tagNameMap={tagNameMap} />}
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
  date?: Date;
  tagNameMap: Map<string, string>;
};

function DraftDetailView(props: DraftDetailViewProps) {
  const { draft, date, tagNameMap } = props;

  const { data: parsedContent, isLoading } = usePromise(
    async (draftId?: number | null, socials?: string[]) => {
      if (!draftId) {
        return undefined;
      }

      const platforms = socials && socials.length > 0 ? socials : ["X"];
      const responses = await Promise.all(
        platforms.map((platform) => getParsedPostContent(platform, draftId).catch(() => undefined)),
      );
      const selected =
        responses.find((response) =>
          Boolean(response && ((response.text?.length ?? 0) > 0 || (response.media?.length ?? 0) > 0)),
        ) || responses.find(Boolean);

      if (!selected) {
        return { text: [], media: [] };
      }

      return {
        text: (selected.text ?? []).map((item) => item.trim()).filter(Boolean),
        media: (selected.media ?? []).map((item) => item.trim()).filter(Boolean),
      };
    },
    [draft.id, draft.socials],
    { execute: Boolean(draft.id), onError: () => {} },
  );

  const charCount = useMemo(() => {
    const combinedText = parsedContent?.text?.join("\n\n") ?? "";
    return combinedText.length > 0 ? combinedText.length : draft.preview?.length;
  }, [draft.preview, parsedContent?.text]);

  const markdown = useMemo(() => {
    const text = parsedContent?.text ?? [];
    const media = parsedContent?.media ?? [];
    const max = Math.max(text.length, media.length);
    if (max === 0) {
      return draft.preview || "No content";
    }

    const sections: string[] = [];
    for (let index = 0; index < max; index++) {
      const partText = text[index] ?? "";
      const partMedia = media[index] ?? "";
      const block = [partText || undefined, partMedia ? `![media-${index + 1}](${partMedia})` : undefined]
        .filter(Boolean)
        .join("\n\n");
      if (block) {
        sections.push(block);
      }
    }

    return sections.length > 0 ? sections.join("\n\n---\n\n") : draft.preview || "No content";
  }, [draft.preview, parsedContent?.media, parsedContent?.text]);

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
          {draft.socials && draft.socials.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Platforms">
              {draft.socials.map((platform) => (
                <List.Item.Detail.Metadata.TagList.Item key={platform} text={getPlatformLabel(platform)} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}
