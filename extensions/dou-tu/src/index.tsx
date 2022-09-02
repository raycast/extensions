import { useEffect, useState } from "react";
import { Grid } from "@raycast/api";
import clipboardService from "./services/clipboardService";
import sourcesService from "./services/sourcesService";
import { IDoutuImage } from "./services/sources";
import { v4 as uuidv4 } from "uuid";

let currentKeyword = "ok";
let currentPageIndex = 1;
let awaitRequest = false;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState("placeholder_1");
  const [list, setList] = useState<IDoutuImage[]>([]);

  useEffect(() => {
    more();
  }, []);

  const more = async () => {
    setIsLoading(true);
    awaitRequest = true;
    const placeholderItem = { id: `placeholder_${currentPageIndex}_${uuidv4()}`, url: "" };
    const items = await sourcesService.get(currentKeyword, currentPageIndex++);
    if (items.length === 0) {
      currentPageIndex = -1;
      return;
    }
    setList([...(currentPageIndex === 2 ? [] : list), placeholderItem, ...items]);
    setSelectedItemId(placeholderItem.id);
    setIsLoading(false);
  };

  return (
    <Grid
      throttle={true}
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      onSearchTextChange={(keyword) => {
        currentKeyword = keyword == "" ? "ok" : keyword;
        currentPageIndex = 1;
        more();
      }}
      onSelectionChange={async (id) => {
        if (!id) return;
        if (id.startsWith("placeholder_")) {
          awaitRequest = false;
          return;
        }
        if (awaitRequest) return;
        if (id === "more") {
          currentPageIndex > 0 && more();
          return;
        }
        const item = list.find((o) => o.id === id);
        item && clipboardService.imageToClipboard(item.url);
      }}
    >
      {list.map((item, index) =>
        item.id.startsWith("placeholder_") ? (
          <Grid.Item
            key={index}
            id={item.id.toString()}
            content={{
              tooltip: "Click images copy",
              value: {
                source: "click.png",
              },
            }}
          />
        ) : (
          <Grid.Item key={index} id={item.id.toString()} content={{ source: item.url }} />
        )
      )}
      {list.length === 0 ? (
        <></>
      ) : (
        <Grid.Item key="more" id="more" content={{ tooltip: "Click more", value: { source: "more.png" } }} />
      )}
    </Grid>
  );
}
