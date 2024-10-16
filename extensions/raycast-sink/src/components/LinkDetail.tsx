import { Detail, ActionPanel, Action, Icon, useNavigation, showToast } from "@raycast/api";
import { Link } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { deleteLink } from "../utils/api";
import { EditLinkView } from "./EditLinkView";
import { useConfig } from "../hooks/useConfig";

interface LinkDetailProps {
  link: Link;
  onRefresh: () => void;
}

export function LinkDetail({ link, onRefresh }: LinkDetailProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { config } = useConfig();
  const managerUrl = `${config?.host}/dashboard/link??slug=${link.slug}`;
  const shortLink = `${config?.host}/${link.slug}`;
  const handleEditSuccess = () => {
    onRefresh();
  };

  const handleDelete = () => {
    try {
      deleteLink(link.slug).then(() => {
        onRefresh();
        pop();
        showToast({
          title: t.deleteSuccess,
          message: t.deleteSuccess,
        });
      });
    } catch (error) {
      showToast({
        title: t.deleteFailed,
        message: t.deleteFailed,
      });
    }
  };

  const markdown = `

## ${t.shortLink}
${shortLink}

## ${t.targetUrl}
${link.url}

## ${t.comment}
${link.comment || ""}

---

## ${t.managerUrl}
${managerUrl}

  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={link.slug}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title={t.slug}>
            <Detail.Metadata.TagList.Item text={link.slug} color={"#eed535"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={t.createdAt} text={new Date(link.createdAt).toLocaleString()} />
          <Detail.Metadata.Label title={t.updatedAt} text={new Date(link.updatedAt).toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title={t.openTargetUrl} url={link.url} />
            <Action.CopyToClipboard title={t.copyShortLink} content={shortLink} />
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
