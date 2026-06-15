import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { fetchSearchIndex } from "./api/rustdoc";
import { useCachedPromise } from "@raycast/utils";
import DocDetail from "./components/DocDetail";

// Mapping of types to icons
const TYPE_ICONS: Record<string, Icon> = {
  struct: Icon.Box,
  enum: Icon.Tag,
  fn: Icon.Code,
  trait: Icon.Circle,
  primitive: Icon.Globe,
  macro: Icon.Hashtag,
  module: Icon.Folder,
  const: Icon.Hashtag,
  static: Icon.Hashtag,
  type: Icon.Text,
  keyword: Icon.Key,
  union: Icon.Layers,
  attr: Icon.Paperclip,
  derive: Icon.Pencil,
};

// Colors
const TYPE_COLORS: Record<string, Color> = {
  struct: Color.Blue,
  enum: Color.Orange,
  fn: Color.Green,
  trait: Color.Magenta,
  primitive: Color.Red,
  macro: Color.Purple,
  module: Color.Yellow,
  const: Color.SecondaryText,
  static: Color.SecondaryText,
  type: Color.Blue,
  keyword: Color.Red,
  union: Color.Orange,
  attr: Color.SecondaryText,
  derive: Color.Purple,
};

function getIconForType(type: string): Icon {
  return TYPE_ICONS[type] || Icon.Document;
}

function getColorForType(type: string): Color {
  return TYPE_COLORS[type] || Color.SecondaryText;
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(fetchSearchIndex, [], {
    keepPreviousData: true,
    initialData: [],
  });

  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch docs",
        message: String(error),
      });
    }
  }, [error]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    if (!searchText) return data.slice(0, 50);

    const lowerSearch = searchText.toLowerCase();

    return data
      .filter((item) => item.path.toLowerCase().includes(lowerSearch))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const search = lowerSearch;

        if (aName === search && bName !== search) return -1;
        if (bName === search && aName !== search) return 1;

        const aStarts = aName.startsWith(search);
        const bStarts = bName.startsWith(search);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      })
      .slice(0, 100);
  }, [data, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Rust Std Lib..."
      throttle
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.url}
          title={item.name}
          subtitle={item.path !== item.name ? item.path : item.type}
          icon={{
            source: getIconForType(item.type),
            tintColor: getColorForType(item.type),
          }}
          accessories={[
            { tag: { value: item.type, color: getColorForType(item.type) } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Sidebar}
                target={<DocDetail item={item} />}
              />
              <Action.OpenInBrowser url={item.url} />
              <Action.CopyToClipboard content={item.path} title="Copy Path" />
              <Action.CopyToClipboard content={item.url} title="Copy URL" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
