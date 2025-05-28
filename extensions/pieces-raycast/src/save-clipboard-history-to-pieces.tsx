import * as fs from "fs";
import * as path from "path";
import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import ClipboardController, {
  ClipboardAsset,
} from "./controllers/ClipboardController";
import { saveClipboardItemToPieces } from "./save-clipboard-to-pieces";
import isImage from "./utils/isImage";
import formatBytes from "./utils/converters/readableBytes";
import timeAgo from "./utils/converters/timeAgo";
import getIcon from "./utils/ui/getDraftIcon";
import getDraftMetadata from "./utils/ui/getDraftMetadata";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default function Command() {
  const [items, setItems] = useState([] as ClipboardAsset[]);
  const [searchText, setSearchText] = useState("");
  // we use this version here because otherwise react will not recognize the state changes in the items
  // this is because the array has the same reference
  // this is the lesser of two evils, the other fix is to copy the array via [...array] each time it changes...
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [version, setVersion] = useState(0);

  const hasRanHealthCheck = useRef(false);

  useEffect(() => {
    if (!hasRanHealthCheck.current) {
      hasRanHealthCheck.current = true;

      piecesHealthCheck();
    }

    ClipboardController.getInstance()
      .updateHistory()
      .finally(() => {
        setItems(ClipboardController.getInstance().getHistory());
      });

    // return the unsubscription call for the controller so it doesn't end up spamming event listeners
    return ClipboardController.getInstance().controller.listen((assets) => {
      setItems(assets);
      setVersion((v) => v + 1);
    });
  }, []);

  const filteredList = items.filter(
    (item) =>
      item.clipboard.text?.includes(searchText) ||
      item.clipboard.file?.includes(searchText) ||
      item.clipboard.html?.includes(searchText),
  );

  function getPath(file: string) {
    return decodeURIComponent(file.replace("file://", ""));
  }

  /**
   * Given a clipboard item, build its markdown body for the main detail view
   * @param item the clipboard item
   * @returns a markdown string
   */
  function getItemMarkdown(item: ClipboardAsset): string {
    const title = getItemTitle(item);

    if (item.clipboard.file) {
      const filePath = getPath(item.clipboard.file);

      const exists = fs.existsSync(filePath);
      if (!exists) {
        return `### **${filePath}**\n\nFile does not exist`;
      }

      const stats = fs.statSync(filePath);
      if (isImage(item.ext) && !stats.isDirectory()) {
        return `### **${title}**\n![${title}](${item.clipboard.file})`;
      }
      if (stats.size > 10e3) {
        return `### **${title}**\n\nFile is too large to render (max 10kb)`;
      } else if (stats.isDirectory()) {
        const directory = fs.readdirSync(filePath);
        return `### **${title}**\n\nDirectory with ${directory.length} items.`;
      }

      const fileContent = fs.readFileSync(filePath);

      return `### **${title}**\n\`\`\`${item.ext}\n${fileContent}\n\`\`\``;
    }
    return `### **${title}**\n\`\`\`${item.ext}\n${item.clipboard.text}\n\`\`\`\n\n${item.annotations?.length ? `**Description:** \n ${item.annotations.map((el) => el.text).join("\n")}` : ""}`;
  }

  function getItemTitle(item: ClipboardAsset): string {
    if (item.clipboard.file) {
      return path.basename(
        decodeURIComponent(item.clipboard.file.replace("file://", "")),
      );
    }

    if (item.name) {
      return item.name;
    }

    if (item.ext) {
      return `${item.ext} Material`;
    }

    return item.clipboard.text.slice(0, 30);
  }

  /**
   * Get the detail metadata for a clipboard item
   * @param item the clipboard item
   * @returns the item's <Detail.metadata> item
   */
  function getMetadata(item: ClipboardAsset): JSX.Element {
    const metadataChildren = getDraftMetadata(item);

    // the clipboard item is a file
    if (item.clipboard.file && fs.existsSync(getPath(item.clipboard.file))) {
      const stats = fs.statSync(getPath(item.clipboard.file));
      metadataChildren.push(
        <Detail.Metadata.Label title="Size" text={formatBytes(stats.size)} />,
        <Detail.Metadata.Label
          title="Created"
          text={timeAgo(stats.birthtime)}
        />,
        <Detail.Metadata.Label title="Modified" text={timeAgo(stats.mtime)} />,
      );
    }

    return <Detail.Metadata>{...metadataChildren}</Detail.Metadata>;
  }

  return (
    <List
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search History"
      searchBarPlaceholder="Search for an item to save in your clipboard history"
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
                  title="Save to Pieces"
                  onAction={() => saveClipboardItemToPieces(item.clipboard)}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No clipboard items found"
          description="Try entering a different search query!"
          icon={{ source: "loadingCat.png" }}
        />
      )}
    </List>
  );
}
