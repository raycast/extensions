import { useEffect, useState } from "react";
import { List, environment, preferences } from "@raycast/api";
import { ListBibmItem } from "./ListBibmItem";
import { spawn } from "child_process";
import { join } from "path";
import { homedir } from "os";

interface State {
  isLoading: boolean;
  items: [];
  error?: Error;
}

export const pythonbin = String(preferences["python"].value || preferences["python"].default).replace("~", homedir());

export default function Command() {
  const [state, setState] = useState<State>({ items: [], isLoading: true });
  useEffect(() => {
    async function loadItems() {
      const python = spawn(pythonbin, [join(environment.assetsPath, "bibm_list.py"), "-u"]);
      python.on("error", (error) => {
        console.log(error);
        setState((previous) => ({ ...previous, isLocked: true, isLoading: false }));
      });
      let itemsString = "";
      python.stdout.on("data", (data) => {
        itemsString += data.toString("utf8");
      });
      python.on("close", (code) => {
        if (code === 0) {
          const items = JSON.parse(itemsString);
          setState((previous) => ({ ...previous, items: items.items, isLoading: false }));
        }
      });
    }
    loadItems();
  }, []);
  return (
    <List isLoading={(!state.items && !state.error) || state.isLoading}>
      <List.EmptyView
        title="bibmanager, where are you?"
        description="Please check that bibmanager is installed correctly and that the location of the corresponding python bin is set correctly!"
      />
      {state.items?.map((item, index) => (
        <ListBibmItem key={index} item={item} index={index} />
      ))}
    </List>
  );
}
