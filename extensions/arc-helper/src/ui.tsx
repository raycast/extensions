import { Action, Detail, Icon, Keyboard, List } from "@raycast/api";
import { GuideLink, MetaForgeUrl, getRarityColor } from "./api";
import { isUrl } from "./format";

export function loadFailure(what: string) {
  return {
    title: `Failed to load ${what}`,
    message: "MetaForge may be temporarily unavailable. Please try again.",
  };
}

export function rarityAccessory(rarity: string | null | undefined): List.Item.Accessory[] {
  return rarity ? [{ tag: { value: rarity, color: getRarityColor(rarity) } }] : [];
}

export function RarityMetadata({ rarity }: { rarity: string | null | undefined }) {
  if (!rarity) return null;
  return (
    <Detail.Metadata.TagList title="Rarity">
      <Detail.Metadata.TagList.Item text={rarity} color={getRarityColor(rarity)} />
    </Detail.Metadata.TagList>
  );
}

export function itemIcon(icon: string | null | undefined, fallback: Icon = Icon.Box) {
  return isUrl(icon) ? { source: icon, fallback } : fallback;
}

/** Guide actions from both the legacy `guide_links` array and the newer relative `guide_url`. */
export function GuideActions({ links, url }: { links?: GuideLink[] | null; url?: string | null }) {
  const guides = (links ?? []).map((link) => ({ title: link.label, url: MetaForgeUrl.absolute(link.url) }));
  if (url) {
    const absolute = MetaForgeUrl.absolute(url);
    if (!guides.some((guide) => guide.url === absolute)) guides.unshift({ title: "Open Guide", url: absolute });
  }
  return (
    <>
      {guides.map((guide, index) => (
        <Action.OpenInBrowser
          key={guide.url}
          title={guide.title}
          icon={Icon.Book}
          url={guide.url}
          shortcut={
            index === 0
              ? { macOS: { modifiers: ["cmd"], key: "g" }, Windows: { modifiers: ["ctrl"], key: "g" } }
              : undefined
          }
        />
      ))}
    </>
  );
}

export function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={onRefresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );
}
