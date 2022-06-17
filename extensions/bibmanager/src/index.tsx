import { useEffect, useState } from "react";
import { List, environment, preferences, showToast, ToastStyle } from "@raycast/api";
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
      showToast(ToastStyle.Animated, "Browsing bibmanager");
      const python = spawn(pythonbin, [join(environment.assetsPath, "bibm_list.py"), "-u"]);
      python.on("error", () => {
        showToast(
          ToastStyle.Failure,
          "bibmanager, where are you?",
          "Update the location of the python bin in the preferences"
        );
        return;
      });
      let itemsString = "";
      python.stdout.on("data", (data) => {
        itemsString += data.toString("utf8");
      });
      python.on("close", (code) => {
        if (code === 0) {
          showToast(ToastStyle.Success, "Done");
          const items = JSON.parse(itemsString);
          setState((previous) => ({ ...previous, items: items.items, isLoading: false }));
        }
      });
    }
    loadItems();
  }, []);
  return (
    <List isLoading={(!state.items && !state.error) || state.isLoading}>
      {state.items?.map((item, index) => (
        <ListBibmItem key={index} item={item} index={index} />
      ))}
    </List>
  );
}
