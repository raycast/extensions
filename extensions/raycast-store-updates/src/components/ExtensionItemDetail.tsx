import { List, Color } from "@raycast/api";
import { StoreItem } from "../types";
import { createStoreDeeplink } from "../utils";

export function ExtensionItemDetail({ item }: { item: StoreItem }) {
  const storeDeeplink = createStoreDeeplink(item.url);
  const hasMac = item.platforms?.some((p) => p.toLowerCase() === "macos") ?? true;
  const hasWindows = item.platforms?.some((p) => p.toLowerCase() === "windows") ?? false;

  // No markdown area — keep sidebar compact with metadata only

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Description" text={item.summary} />

          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item
              text={item.type === "new" ? "New" : "Updated"}
              color={item.type === "new" ? Color.Green : Color.Blue}
            />
          </List.Item.Detail.Metadata.TagList>

          {item.version && <List.Item.Detail.Metadata.Label title="Version" text={item.version} />}

          <List.Item.Detail.Metadata.TagList title="Platforms">
            {hasMac && <List.Item.Detail.Metadata.TagList.Item text="macOS" color={Color.PrimaryText} />}
            {hasWindows && <List.Item.Detail.Metadata.TagList.Item text="Windows" color={Color.PrimaryText} />}
          </List.Item.Detail.Metadata.TagList>

          {item.categories && item.categories.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Categories">
              {item.categories.map((cat) => (
                <List.Item.Detail.Metadata.TagList.Item key={cat} text={cat} color={Color.SecondaryText} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link title="Author" text={item.authorName} target={item.authorUrl} />
          <List.Item.Detail.Metadata.Link title="Store" text="Open in Store" target={storeDeeplink} />

          {item.prUrl && <List.Item.Detail.Metadata.Link title="Pull Request" text={`View PR`} target={item.prUrl} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
