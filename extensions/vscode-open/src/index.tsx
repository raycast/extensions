import { Action, ActionPanel, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState } from "react";
import { homedir } from "node:os";
import * as fs from "fs";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useExec("mdfind", ["-name", searchText ? searchText : "sdfsdxdsf12312"]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="搜索文件夹/文件..." throttle>
      {data
        ?.split("\n")
        ?.filter((i) => i)
        ?.map((path) => <SearchListItem key={path} path={path} />)}
    </List>
  );
}

function SearchListItem({ path }: { path: string }) {
  const stats = fs.statSync(path);
  const icon = stats.isDirectory() ? "folder.png" : "file.png";

  return (
    <List.Item
      title={path.replace(homedir(), "~")}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              title="Open With VSCode"
              icon={"Code.png"}
              target={path}
              application={"/Applications/Visual Studio Code.app"}
            />
            <Action.ShowInFinder title="Show In Finder" path={path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
