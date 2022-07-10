import { useEffect, useState } from "react";
import { List, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ListBibmItem } from "./ListBibmItem";
import { spawn } from "child_process";
import { join } from "path";
import { homedir } from "os";

interface State {
  isLoading: boolean;
  items: [];
  error?: Error;
}

interface Preferences {
  python: string;
}

const preferences = getPreferenceValues<Preferences>();
export const pythonbin = preferences["python"].replace("~", homedir());

export default function Command() {
  const [state, setState] = useState<State>({ items: [], isLoading: true });
  useEffect(() => {
    async function loadItems() {
      showToast(Toast.Style.Animated, "Browsing bibmanager");
      const python = spawn(pythonbin, [join(environment.assetsPath, "bibm_list.py"), "-u"]);
      python.on("error", () => {
        showToast(
          Toast.Style.Failure,
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
          showToast(Toast.Style.Success, "Done");
          const items = JSON.parse(itemsString);
          setState((previous) => ({ ...previous, items: items.items, isLoading: false }));
        }
      });
    }
    loadItems();
  }, []);
  return (
    <List isShowingDetail isLoading={(!state.items && !state.error) || state.isLoading}>
      {state.items?.map((item, index) => (
        <ListBibmItem key={index} item={item} index={index} />
      ))}
    </List>
  );
}
