import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { useEffect, useState } from "react";
import Service from "./api/service";
import {SheetView} from "./components/SheetView";
import {getSheets} from "./utils";


function Command() {
  const [sheets, setSheets] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchList() {
      const files = await Service.listFiles();
      // console.log(files)
      const sheets = getSheets(files);
      console.log(sheets)
      setSheets(sheets);
      setLoading(false);
    }

    fetchList();
  }, []);

  return (
    <List isLoading={isLoading}>
      {sheets.map((sheet) => (
        <List.Item
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Cheatsheet"
                target={<SheetView slug={sheet}
                />}
              />
            </ActionPanel>
          }
          key={sheet}
          title={sheet}
        />
      ))}
    </List>
  );
}

export default Command;
