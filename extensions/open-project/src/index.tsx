import * as React from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import os from "os";
import path from "path";
import Fuse from "fuse.js";
import { getProjects } from "./open-project";

export default function Command() {
  const [searchText, setSearchText] = React.useState("");

  const abortable = React.useRef<AbortController>();
  const { isLoading, data } = usePromise(
    async (searchText: string) => {
      const searchResults = [...(await getProjects(path.join(os.homedir(), "code")))];
      if (!searchText) {
        return searchResults;
      }
      const fuse = new Fuse(searchResults, {
        keys: ["dir", "fullPath"],
      });
      return fuse.search(searchText).map(({ item }) => item);
    },
    [searchText],
    {
      abortable,
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search projects..." throttle>
      <List.Section title="Results" subtitle={data?.length + ""}>
        {!isLoading &&
          data?.map((searchResult) => (
            <List.Item
              key={searchResult.fullPath}
              title={searchResult.dir}
              subtitle={searchResult.fullPath}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open
                      title="Open in VSCode"
                      icon={Icon.Code}
                      target={searchResult.fullPath}
                      application={{ name: "code", path: "/Applications/Visual Studio Code.app" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
