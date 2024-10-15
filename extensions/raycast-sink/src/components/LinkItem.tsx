import { List, ActionPanel, Action, Icon, Image } from "@raycast/api";
import { Link } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { URL } from "url";
import { LinkDetail } from "./LinkDetail";
import { Config } from "../types";

interface LinkItemProps {
  link: Link;
  config: Config;
  onRefresh: () => void;
  onCleanCache: () => void;
  updateConfig: (newConfig: Partial<Config>) => void;
}

export function LinkItem({ link, config, onRefresh, onCleanCache }: LinkItemProps) {
  const { t } = useTranslation();

  const BASE_URL = config?.host;
  const showWebsitePreview = config?.showWebsitePreview === "true" ? true : false;
  const rightAccessories: List.Item.Accessory[] = [{ text: new Date(link.createdAt * 1000).toLocaleDateString() }];
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
            target={<LinkDetail link={link} onRefresh={onRefresh} />}
            title={t.viewLinkDetails || "View Link Details"}
          />

          <Action.OpenInBrowser url={`${BASE_URL}/${link.slug}`} title={t.openShortLink || "Open Short Link"} />
          <Action.OpenInBrowser url={link.url} title={t.openTargetUrl || "Open Target URL"} />
          <Action.CopyToClipboard content={`${BASE_URL}/${link.slug}`} title={t.copyShortLink || "Copy Short Link"} />
          <Action title={t.refreshList || "Refresh List"} onAction={onRefresh} icon={Icon.ArrowClockwise} />
          <Action title={t.clearCache || "Clear Cache"} onAction={onCleanCache} icon={Icon.Trash} />
        </ActionPanel>
      }
    />
  );
}
