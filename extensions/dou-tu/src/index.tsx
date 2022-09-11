import { useEffect, useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Grid } from "@raycast/api";
import clipboardService from "./services/clipboardService";
import sourcesService from "./services/sourcesService";
import { IDoutuImage } from "./services/sources";
import { v4 as uuidv4 } from "uuid";

let currentKeyword = "";
let currentPageIndex = 1;
let awaitRequest = false;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnd, setIsEnd] = useState(true);
  const [list, setList] = useState<IDoutuImage[]>([]);
  const [selectMode, setSelectMode] = useState("actions");
  // eslint-disable-next-line prefer-const
  let [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  useEffect(() => {
    more();
    const { select_mode } = getPreferenceValues<{
      select_mode: string;
    }>();
    setSelectMode(select_mode);
    if (select_mode === "click") setSelectedItemId("placeholder_1");
  }, []);

  const more = async () => {
    setIsLoading(true);
    const placeholderItem = { id: `placeholder_${currentPageIndex}_${uuidv4()}`, url: "" };
    const result = await sourcesService.get(currentKeyword, currentPageIndex++);
    setIsEnd(result.isEnd);
    if (result.images.length === 0) {
      currentPageIndex = -1;
      setList([]);
    } else {
      if (selectMode === "click") {
        awaitRequest = true;
        setList([...(currentPageIndex === 2 ? [] : list), placeholderItem, ...result.images]);
        setSelectedItemId(placeholderItem.id);
      } else setList([...(currentPageIndex === 2 ? [] : list), ...result.images]);
    }
    setIsLoading(false);
  };

  const selectAction = (id: string | undefined) => {
    if (!id) return;
    const item = list.find((o) => o.id === id);
    item && clipboardService.imageToClipboard(item.url);
  };

  const searchBarAccessory = (
    <Grid.Dropdown
      tooltip="Select Source"
      storeValue={true}
      onChange={(sourceName) => {
        if (sourceName === sourcesService.getSource()?.name) return;
        sourcesService.changeSource(sourceName);
        currentPageIndex = 1;
        more();
      }}
    >
      <Grid.Dropdown.Section title="Emoji Categories">
        {sourcesService.sources.map((source, index) => (
          <Grid.Dropdown.Item key={index} title={source.name} value={source.name} />
        ))}
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );

  const actions = (
    <ActionPanel>
      {selectMode === "actions" ? <Action title="Copy Image" onAction={() => selectAction(selectedItemId)} /> : null}
    </ActionPanel>
  );

  return (
    <Grid
      throttle={true}
      isLoading={isLoading}
      selectedItemId={selectedItemId}
      onSearchTextChange={(keyword) => {
        currentKeyword = keyword;
        currentPageIndex = 1;
        more();
      }}
      onSelectionChange={(id: string | undefined) => {
        if (!id) return;
        if (selectMode === "click") {
          if (awaitRequest) return (awaitRequest = !id.startsWith("placeholder_"));
          if (id.startsWith("placeholder_")) return;
          if (id === "more" && currentPageIndex > 0) return more();
          selectAction(id);
        } else {
          if (id === "more" && currentPageIndex > 0) return more();
          selectedItemId = id;
        }
      }}
      searchBarAccessory={searchBarAccessory}
    >
      {list.map((item, index) =>
        item.id.startsWith("placeholder_") ? (
          <Grid.Item
            key={index}
            id={item.id.toString()}
            content={{
              tooltip: "Click Images Copy",
              value: {
                source: "click.png",
              },
            }}
          />
        ) : (
          <Grid.Item key={index} id={item.id.toString()} content={{ source: item.url }} actions={actions} />
        )
      )}
      {isEnd ? (
        <></>
      ) : (
        <Grid.Item key="more" id="more" content={{ tooltip: "Click More", value: { source: "more.png" } }} />
      )}
    </Grid>
  );
}
