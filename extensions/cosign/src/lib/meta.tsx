import type { ReactNode } from "react";
import { Color, Detail, Icon, Image, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export type MetaItem =
  | { kind: "label"; title: string; text?: string; icon?: Image.ImageLike }
  | { kind: "link"; title: string; text: string; target: string }
  | { kind: "tags"; title: string; tags: string[]; color?: Color.ColorLike }
  | { kind: "separator" };

/** What a person, company, round or role shows in a list sidebar or a pushed Detail. */
export interface Content {
  markdown: string;
  meta: MetaItem[];
}

type MetaNamespace = typeof Detail.Metadata;

function renderItems(M: MetaNamespace, items: MetaItem[]): ReactNode {
  return items.map((item, i) => {
    switch (item.kind) {
      case "label":
        return <M.Label key={i} title={item.title} text={item.text} icon={item.icon} />;
      case "link":
        return <M.Link key={i} title={item.title} text={item.text} target={item.target} />;
      case "tags":
        return (
          <M.TagList key={i} title={item.title}>
            {item.tags.map((tag) => (
              <M.TagList.Item key={tag} text={tag} color={item.color} />
            ))}
          </M.TagList>
        );
      case "separator":
        return <M.Separator key={i} />;
    }
  });
}

export function detailMetadata(items: MetaItem[]): ReactNode {
  return <Detail.Metadata>{renderItems(Detail.Metadata, items)}</Detail.Metadata>;
}

export function listDetailMetadata(items: MetaItem[]): ReactNode {
  return (
    <List.Item.Detail.Metadata>
      {renderItems(List.Item.Detail.Metadata as unknown as MetaNamespace, items)}
    </List.Item.Detail.Metadata>
  );
}

export const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export const favicon = (url: string) => getFavicon(url, { fallback: Icon.Globe, mask: Image.Mask.RoundedRectangle });

export const avatar = (url: string | null): Image.ImageLike => ({
  source: url ?? Icon.Person,
  mask: Image.Mask.Circle,
  fallback: Icon.Person,
});
