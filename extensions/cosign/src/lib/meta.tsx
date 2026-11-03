import type { ReactNode } from "react";
import { Detail, List } from "@raycast/api";

export type MetaItem =
  | { kind: "label"; title: string; text: string }
  | { kind: "link"; title: string; text: string; target: string }
  | { kind: "tags"; title: string; tags: string[] }
  | { kind: "separator" };

type MetaNamespace = typeof Detail.Metadata;

/** One description of the sidebar, rendered into either Detail.Metadata (pushed screen) or List.Item.Detail.Metadata (list pane). */
function renderItems(M: MetaNamespace, items: MetaItem[]): ReactNode {
  return items.map((item, i) => {
    switch (item.kind) {
      case "label":
        return <M.Label key={i} title={item.title} text={item.text} />;
      case "link":
        return <M.Link key={i} title={item.title} text={item.text} target={item.target} />;
      case "tags":
        return (
          <M.TagList key={i} title={item.title}>
            {item.tags.map((tag) => (
              <M.TagList.Item key={tag} text={tag} />
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
