import { List, Color, Icon } from "@raycast/api";
import { StoreItem } from "../types";
import { createStoreDeeplink, CATEGORY_COLORS, MACOS_TINT_COLOR, WINDOWS_TINT_COLOR } from "../utils";

export function ExtensionItemDetail({ item }: { item: StoreItem }) {
  const storeDeeplink = createStoreDeeplink(item.url);
  const hasMac = item.platforms?.some((p) => p.toLowerCase() === "macos") ?? true;
  const hasWindows = item.platforms?.some((p) => p.toLowerCase() === "windows") ?? false;

  const validCategories = (item.categories ?? []).filter((c) => typeof c === "string" && c.trim().length > 0);

  const dateLabel = item.type === "new" ? "Published" : item.type === "removed" ? "Removed" : "Updated";
  const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Description" text={item.summary} />

          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item
              text={item.type === "new" ? "New" : item.type === "removed" ? "Removed" : "Update"}
              icon={
                item.type === "new" ? Icon.StarCircle : item.type === "removed" ? Icon.MinusCircle : Icon.ArrowUpCircle
              }
              color={item.type === "new" ? Color.Green : item.type === "removed" ? Color.Red : Color.Blue}
            />
          </List.Item.Detail.Metadata.TagList>

          {item.type !== "removed" && (
            <List.Item.Detail.Metadata.TagList title="Compatibility">
              {hasMac && (
                <List.Item.Detail.Metadata.TagList.Item
                  icon={{ source: "platform-macos.svg", tintColor: MACOS_TINT_COLOR }}
                />
              )}
              {hasWindows && (
                <List.Item.Detail.Metadata.TagList.Item
                  icon={{ source: "platform-windows.svg", tintColor: WINDOWS_TINT_COLOR }}
                />
              )}
            </List.Item.Detail.Metadata.TagList>
          )}

          {validCategories.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Categories">
              {validCategories.map((cat) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={cat}
                  text={cat}
                  color={CATEGORY_COLORS[cat] ?? Color.SecondaryText}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title={dateLabel} text={formattedDate} />

          {item.version && <List.Item.Detail.Metadata.Label title="Version" text={item.version} />}
          {item.prUrl && <List.Item.Detail.Metadata.Link title="Pull Request" text="View PR" target={item.prUrl} />}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link title="Author" text={item.authorName} target={item.authorUrl} />
          {item.type !== "removed" && (
            <List.Item.Detail.Metadata.Link title="Store" text="Open in Raycast Store" target={storeDeeplink} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
