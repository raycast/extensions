import { useEffect, useMemo, useState } from "react";
import { List, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ListBibmItem } from "./ListBibmItem";
import { Item, Preferences, State } from "./types";
import { spawn } from "child_process";
import { join } from "path";
import { filterFct } from "./filtering";
import { homedir } from "os";

const preferences = getPreferenceValues<Preferences>();
export const pythonbin = preferences["python"].replace("~", homedir());

export default function Command() {
  const [state, setState] = useState<State>({ items: [], isLoading: true, searchText: "" });

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

  const filteredList: Item[] = useMemo(() => filterFct(state.items, state.searchText), [state.searchText, state.items]);

  return (
    <List
      isShowingDetail
      isLoading={(!state.items && !state.error) || state.isLoading}
      enableFiltering={false}
      onSearchTextChange={(text) => setState((previous) => ({ ...previous, searchText: text }))}
    >
      {filteredList?.map((item, index) => (
        <ListBibmItem key={index} item={item} />
      ))}
    </List>
  );
}
