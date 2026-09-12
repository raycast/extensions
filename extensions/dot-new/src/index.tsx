import { Action, ActionPanel, environment, Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import fs from "fs";
import Fuse from "fuse.js";
import { useState } from "react";

type DataSet = { text: string; url: string; provider: string }[];
const dataset = JSON.parse(fs.readFileSync(`${environment.assetsPath}/dataset.json`, "utf-8")) as DataSet;

const fuse = new Fuse(dataset, { keys: ["title", "url", "provider"] });

export function getFilteredDataset(query?: string): DataSet {
  return !query ? dataset : fuse.search(query, { limit: 10 }).map((result) => result.item);
}

export default function main() {
  const [prepDataSet, setPrepDataSet] = useState(getFilteredDataset());

  function handleSearchTextChange(text: string) {
    setPrepDataSet(getFilteredDataset(text));
  }

  return (
    <List
      navigationTitle="Start something new!"
      searchBarPlaceholder="Search your favorite shortcut"
      onSearchTextChange={handleSearchTextChange}
    >
      {prepDataSet.map(({ url, text, provider }, index) => (
        <List.Item
          key={index}
          title={url}
          subtitle={text}
          icon={getFavicon("https://" + url, { fallback: Icon.Globe })}
          accessories={[{ text: provider }]}
          actions={
            <ActionPanel>
              {/* We anticipate the protocol which hopefully is https anyway! */}
              <Action.OpenInBrowser url={"https://" + url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
