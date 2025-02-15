import { useEffect, useState } from "react";
import AssetsController from "./controllers/AssetsController";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  List,
  showHUD,
} from "@raycast/api";
import classificationSpecificToReadable from "./utils/converters/classificationSpecificToReadable";
import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";
import getIcon from "./utils/ui/getDraftIcon";
import { StrippedAsset } from "./types/strippedAsset";
import getDraftMetadata from "./utils/ui/getDraftMetadata";

export default function Command() {
  const [items, setItems] = useState(
    AssetsController.getInstance().getAssets().assets,
  );
  const [searchText, setSearchText] = useState("");
  // using this to force a rerender
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [value, setValue] = useState(0);

  useEffect(() => {
    return AssetsController.getInstance().controller.listen((assets) => {
      setItems(assets.assets);
      setValue((v) => v + 1);
    });
  }, []);

  function getItemTitle(item: StrippedAsset) {
    return item.name ?? "Unnamed Asset";
  }

  /**
   * Given a clipboard item, build its markdown body for the main detail view
   * @param item the clipboard item
   * @returns a markdown string
   */
  function getItemMarkdown(item: StrippedAsset): string {
    const title = getItemTitle(item);

    return `### **${title}**\n\`\`\`${item.ext}\n${item.text}\n\`\`\`\n\n${item.annotations?.length ? `**Description:** \n ${item.annotations.map((el) => el.text).join("\n")}` : ""}`;
  }

  /**
   * Get the detail metadata for a clipboard item
   * @param item the clipboard item
   * @returns the item's <Detail.metadata> item
   */
  function getMetadata(item: StrippedAsset): JSX.Element {
    const metadataChildren = getDraftMetadata(item);

    return <Detail.Metadata>{...metadataChildren}</Detail.Metadata>;
  }

  const filteredList = items.filter(
    (item) =>
      item.name?.includes(searchText) ||
      item.ext?.includes(searchText) ||
      item.text.includes(searchText) ||
      item.websites?.some((el) => el.url.includes(searchText)) ||
      item.tags?.some((el) => el.text.includes(searchText)) ||
      classificationSpecificToReadable(
        item.ext || ClassificationSpecificEnum.Unknown,
      )?.includes(searchText),
  );

  return (
    <List
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search History"
      searchBarPlaceholder="Search for a saved material"
    >
      {filteredList.length ? (
        filteredList.map((item, index) => (
          <List.Item
            key={`clipboard-history-${index}`}
            title={getItemTitle(item)}
            icon={getIcon(item)}
            detail={
              <List.Item.Detail
                markdown={getItemMarkdown(item)}
                metadata={getMetadata(item)}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  onAction={() => {
                    Clipboard.copy(item.text).then(() =>
                      showHUD("Copied material to clipboard"),
                    );
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No materials found"
          description="Try entering a different search query!"
          icon={{ source: "loadingCat.png" }}
        />
      )}
    </List>
  );
}
