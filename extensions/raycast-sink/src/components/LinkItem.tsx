import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { Link } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { URL } from "url";
import { LinkDetail } from "./LinkDetail";
import { Config } from "../types";
import { deleteLink } from "../utils/api";

interface LinkItemProps {
  link: Link;
  config: Config;
  onRefresh: () => void;
  onCleanCache: () => void;
}

export function LinkItem({ link, config, onRefresh, onCleanCache }: LinkItemProps) {
  const { t } = useTranslation();
  const BASE_URL = config?.host;
  const showWebsitePreview = config?.showWebsitePreview ? true : false;
  const rightAccessories: List.Item.Accessory[] = [{ text: new Date(link.createdAt * 1000).toLocaleDateString() }];

  const handleDelete = async () => {
    await deleteLink(link.slug);
    onRefresh();
  };

  return (
    <List.Item
      title={`${link.slug}`}
      subtitle={link.url}
      accessories={[...rightAccessories]}
      icon={
        showWebsitePreview
          ? {
              source: `https://unavatar.io/${new URL(link.url).hostname}?fallback=https://sink.cool/sink.png`,
              mask: Image.Mask.Circle,
            }
          : Icon.Link
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Paragraph}
            target={<LinkDetail link={link} onRefresh={onRefresh} />}
            title={t.viewLinkDetails || "View Link Details"}
          />

          <Action.OpenInBrowser url={`${BASE_URL}/${link.slug}`} title={t.openShortLink || "Open Short Link"} />
          <Action.OpenInBrowser url={link.url} title={t.openTargetUrl || "Open Target URL"} />
          <Action.CopyToClipboard content={`${BASE_URL}/${link.slug}`} title={t.copyShortLink || "Copy Short Link"} />
          <Action title={t.deleteLink || "Delete Link"} onAction={handleDelete} icon={Icon.Trash} />
          <Action title={t.refreshList || "Refresh List"} onAction={onRefresh} icon={Icon.ArrowClockwise} />
          <Action title={t.clearCache || "Clear Cache"} onAction={onCleanCache} icon={Icon.Trash} />
        </ActionPanel>
      }
    />
  );
}
