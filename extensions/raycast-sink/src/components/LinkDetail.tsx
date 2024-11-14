import { Detail, ActionPanel, Action, Toast, Icon, useNavigation, showToast } from "@raycast/api";
import { Link } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { deleteLink } from "../utils/api";
import { EditLinkView } from "./EditLinkView";
import { useConfig } from "../hooks/useConfig";
import { SLUG_LABEL_COLOR } from "../constants";
import { queryLink } from "../utils/api";
import { useState } from "react";

interface LinkDetailProps {
  link: Link;
  onRefresh: () => void;
}

export function LinkDetail({ link: initialLink, onRefresh }: LinkDetailProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { config } = useConfig();
  const [link, setLink] = useState(initialLink);

  const managerUrl = `${config?.host}/dashboard/link??slug=${link.slug}`;
  const shortLink = `${config?.host}/${link.slug}`;

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

## 🍞 ${t.shortLink}
${shortLink}

## 🔗 ${t.targetUrl}
${link.url}

${link.comment ? `## 💬 ${t.comment}\n${link.comment || ""}` : ""}


---

## 🎛️ ${t.managerUrl}
${managerUrl}

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
