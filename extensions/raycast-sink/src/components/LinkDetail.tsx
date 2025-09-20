import { Detail, ActionPanel, Action, Toast, Icon, useNavigation, showToast } from "@raycast/api";
import { Link } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { deleteLink } from "../utils/api";
import { EditLinkView } from "./EditLinkView";
import { useConfig } from "../hooks/useConfig";
import { SLUG_LABEL_COLOR } from "../constants";
import { queryLink, statsCounter } from "../utils/api";
import { useState, useEffect } from "react";

interface LinkDetailProps {
  link: Link;
  onRefresh: () => void;
}

interface StatsCounter {
  meta: Array<{ name: string; type: string }>;
  data: Array<{
    visits: string;
    visitors: string;
    referers: string;
  }>;
  rows: number;
  rows_before_limit_at_least: number;
}

export function LinkDetail({ link: initialLink, onRefresh }: LinkDetailProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { config } = useConfig();
  const [link, setLink] = useState(initialLink);
  const [stats, setStats] = useState<StatsCounter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const managerUrl = `${config?.host}/dashboard/link?slug=${link.slug}`;
  const shortLink = `${config?.host}/${link.slug}`;

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const toast = await showToast({ title: t.loadingStats, style: Toast.Style.Animated });
      try {
        const data = await statsCounter(link.id);
        setStats(data as StatsCounter);
        toast.style = Toast.Style.Success;
        toast.title = t.statsLoaded;
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        toast.style = Toast.Style.Failure;
        toast.title = t.statsLoadFailed;
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [link.id]);

  const handleEditSuccess = async () => {
    const toast = await showToast({ title: t.linkUpdating, style: Toast.Style.Animated });
    try {
      const updatedLink = (await queryLink(link.slug)) as Link;
      setLink(updatedLink);
      onRefresh();
      toast.style = Toast.Style.Success;
      toast.title = t.linkUpdated;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t.linkQueryFailed;
      toast.message = String(error);
    }
  };

  const handleDelete = async () => {
    const toast = await showToast({ title: t.linkDeleting, style: Toast.Style.Animated });
    try {
      await deleteLink(link.slug);
      toast.style = Toast.Style.Success;
      toast.title = t.deleteSuccess;
      toast.message = t.deleteSuccess;
      pop();
      onRefresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.message = String(error);
    }
  };

  const markdown = `

## 📊 ${t.statistics}
| ${t.visits} | ${t.visitors} | ${t.referers} |
|------------|--------------|--------------|
| ${isLoading ? "..." : stats?.data?.[0]?.visits || "0"} | ${isLoading ? "..." : stats?.data?.[0]?.visitors || "0"} | ${isLoading ? "..." : stats?.data?.[0]?.referers || "0"} |

## 🍞 ${t.shortLink}
${shortLink}

## 🔗 ${t.targetUrl}
${link.url}

  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={link.slug}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={t.slug}>
            <Detail.Metadata.TagList.Item text={link.slug} color={SLUG_LABEL_COLOR} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title={t.createdAt} text={new Date(link.createdAt * 1000).toLocaleString()} />
          <Detail.Metadata.Label title={t.updatedAt} text={new Date(link.updatedAt * 1000).toLocaleString()} />
          <Detail.Metadata.Separator />
          {link.comment && (
            <>
              <Detail.Metadata.Label title={t.comment} text={link.comment} />
              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.Link title={`${t.managerUrl}`} target={managerUrl} text={managerUrl} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={t.openTargetUrl} url={link.url} />
            <Action.CopyToClipboard title={t.copyShortLink} content={shortLink} />
            <Action.OpenInBrowser title={t.openManagerUrl} url={managerUrl} />
            <Action.Push
              title={t.editLink}
              icon={Icon.Pencil}
              target={<EditLinkView link={link} onEditSuccess={handleEditSuccess} />}
            />

            <Action icon={Icon.Trash} title={t.deleteLink} onAction={handleDelete} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
