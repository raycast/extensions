import { ActionPanel, Action, List, Icon } from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
import { vsCodePath, vsCodeInsidersPath } from "../data";
import Editor from "./Editor";
import SearchSection from "./SearchSection";

type SetItem = Required<Item>;
export default function Search() {
  const [vsCodeItems, setVsCodeItems] = useState<SetItem[] | null>(null);
  const [vsCodeInsidersItems, setVsCodeInsidersItems] = useState<SetItem[] | null>(null);
  useEffect(() => {
    if (fs.existsSync(vsCodePath)) {
      const obj = JSON.parse(fs.readFileSync(vsCodePath).toString()) as {
        [key: string]: {
          prefix: string;
          description: string;
          body: string[];
          scope: string;
        };
      };
      const items = Object.keys(obj).map((key) => {
        return { ...obj[key], body: obj[key].body.join("\n"), scope: obj[key].scope.split(","), id: key };
      });
      setVsCodeItems(items);
    }
    if (fs.existsSync(vsCodeInsidersPath)) {
      const obj = JSON.parse(fs.readFileSync(vsCodeInsidersPath).toString()) as {
        [key: string]: {
          prefix: string;
          description: string;
          body: string[];
          scope: string;
        };
      };
      const items = Object.keys(obj).map((key) => {
        return { ...obj[key], body: obj[key].body.join("\n"), scope: obj[key].scope.split(","), id: key };
      });
      setVsCodeInsidersItems(items);
    }
  }, []);

  return (
    <List
      isShowingDetail
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Pencil} title="Create Snippet" target={<Editor />}></Action.Push>
        </ActionPanel>
      }
    >
      <SearchSection title={"Visual Studio Code"} items={vsCodeItems} />
      <SearchSection title={"Visual Studio Code Insiders"} items={vsCodeInsidersItems} />
    </List>
  );
}
