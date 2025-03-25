import URL from "url";
import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import classificationSpecificToReadable from "./utils/converters/classificationSpecificToReadable";
import BrowserController, {
  BrowserAsset,
} from "./controllers/BrowserController";
import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";
import { saveTextToPieces } from "./actions/saveAsset";
import getDraftMetadata from "./utils/ui/getDraftMetadata";
import getIcon from "./utils/ui/getDraftIcon";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default function Command() {
  const [items, setItems] = useState([] as BrowserAsset[]);
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

    BrowserController.getInstance()
      .updateHistory()
      .finally(() => {
        setItems(BrowserController.getInstance().getHistory());
      });

    // return the unsubscription call for the controller so it doesn't end up spamming event listeners
    return BrowserController.getInstance().controller.listen((assets) => {
      setItems(assets);
      setVersion((v) => v + 1);
    });
  }, []);

  const filteredList = items.filter(
    (item) =>
      item.browser.code.includes(searchText) ||
      item.browser.tab.url.includes(searchText) ||
      item.browser.tab.title?.includes(searchText) ||
      item.ext?.includes(searchText) ||
      classificationSpecificToReadable(
        item.ext || ClassificationSpecificEnum.Unknown,
      )?.includes(searchText),
  );

  /**
   * Given a clipboard item, build its markdown body for the main detail view
   * @param item the clipboard item
   * @returns a markdown string
   */
  function getItemMarkdown(item: BrowserAsset): string {
    const title = getItemTitle(item);

    return `### **${title}**\n\`\`\`${item.ext}\n${item.browser.code}\n\`\`\`\n\n${item.annotations?.length ? `**Description:** \n ${item.annotations.map((el) => el.text).join("\n")}` : ""}`;
  }

  function getItemTitle(item: BrowserAsset): string {
    if (item.name) {
      return item.name;
    }

    if (item.ext) {
      return `${item.ext} Material`;
    }

    return `Saved from ${item.browser.tab.title ?? item.browser.tab.url}`;
  }

  /**
   * Get the detail metadata for a clipboard item
   * @param item the clipboard item
   * @returns the item's <Detail.metadata> item
   */
  function getMetadata(item: BrowserAsset): JSX.Element {
    const metadataChildren = getDraftMetadata(item);

    if (item.browser.tab.favicon)
      metadataChildren.push(
        <Detail.Metadata.Label
          title="Favicon"
          icon={{ source: item.browser.tab.favicon }}
        />,
      );

    metadataChildren.push(
      <Detail.Metadata.Link
        title="Link"
        text={item.browser.tab.title ?? new URL.URL(item.browser.tab.url).host}
        target={item.browser.tab.url}
      />,
    );

    return <Detail.Metadata>{...metadataChildren}</Detail.Metadata>;
  }

  return (
    <List
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search History"
      searchBarPlaceholder="Search for an item to save in your browser history"
    >
      {filteredList.length ? (
        filteredList.map((item, index) => (
          <List.Item
            key={`browser-history-${index}`}
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
                  onAction={() =>
                    saveTextToPieces(item.browser.code, undefined, item.ext)
                  }
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No code blocks found"
          description="Try opening a website that has some code on it!"
          icon={{ source: "loadingCat.png" }}
        />
      )}
    </List>
  );
}
