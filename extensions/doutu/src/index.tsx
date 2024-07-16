import { useEffect, useState } from "react";
import { Action, ActionPanel, Grid } from "@raycast/api";
import clipboardService from "./services/clipboardService";
import sourcesService from "./services/sourcesService";
import { IDoutuImage } from "./services/sources";

let currentKeyword = "";
let currentPageIndex = 1;

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnd, setIsEnd] = useState(true);
  const [list, setList] = useState<IDoutuImage[]>([]);
  let selectedItemId: string | undefined;

  useEffect(() => {
    more();
  }, []);

  const more = async () => {
    setIsLoading(true);
    const result = await sourcesService.get(currentKeyword, currentPageIndex++);
    // console.log(result);
    setIsEnd(result.isEnd);
    if (result.images.length === 0) {
      currentPageIndex = -1;
      setList([]);
    } else {
      setList([...(currentPageIndex === 2 ? [] : list), ...result.images]);
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
      <Action title="Copy Image" onAction={() => selectAction(selectedItemId)} />
    </ActionPanel>
  );

  return (
    <Grid
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={(keyword) => {
        currentKeyword = keyword;
        currentPageIndex = 1;
        more();
      }}
      onSelectionChange={(id: string | null) => {
        if (!id) return;
        if (id === "more" && currentPageIndex > 0) return more();
        selectedItemId = id;
      }}
      searchBarAccessory={searchBarAccessory}
    >
      {list.map((item, index) => (
        <Grid.Item key={index} id={item.id.toString()} content={{ source: item.url }} actions={actions} />
      ))}
      {isEnd ? (
        <></>
      ) : (
        <Grid.Item key="more" id="more" content={{ tooltip: "Click More", value: { source: "more.png" } }} />
      )}
    </Grid>
  );
}
