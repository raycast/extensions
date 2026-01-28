import { LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences } from "./lib/types";
import { MacroActionPanel } from "./components/action-panel";
import { useCachedPromise } from "@raycast/utils";
import { fetchMacros } from "./lib/fetch-macros";
import Fuse from "fuse.js";

interface Arguments {
  name?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { isLoading, data, revalidate } = useCachedPromise(fetchMacros);
  const preferences = getPreferenceValues<Preferences>();

  const [searchText, setSearchText] = useState(props.arguments.name ?? "");
  const [filteredList, setFilteredList] = useState(data);

  const displayTypes: string[] = [];
  if (preferences.displayTriggers) {
    displayTypes.push("Typed String Trigger");
  }
  if (preferences.displayShortcuts) {
    displayTypes.push("Hot Key Trigger");
  }

  useEffect(() => {
    if (data) {
      if (!searchText) {
        setFilteredList(data);
      } else {
        const macros = data.flatMap((item) => item.macros || []);

        const fuse = new Fuse(macros, {
          keys: ["name"],
          threshold: 0.4,
        });
        const result = fuse.search(searchText).map(({ item }) => item);

        const groupedResult = data.map((group) => ({
          ...group,
          macros: group.macros?.filter((macro) => result.includes(macro)),
        }));
        setFilteredList(groupedResult);
      }
    }
  }, [searchText, data]);

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText}>
      {filteredList?.map((group) => (
        <List.Section key={group.uid} title={`${group.name}`} subtitle={`${group.macros?.length}`}>
          {group.macros?.map((macro) => {
            const triggers = macro.triggers
              ?.filter((trigger) => trigger.type && displayTypes.includes(trigger.type))
              .map((trigger) => ({ tag: { value: trigger.short } }));
            return (
              <List.Item
                key={macro.uid}
                title={macro.enabled ? macro?.name ?? "" : ""}
                subtitle={macro.enabled ? "" : macro?.name ?? ""}
                icon={preferences.displayIcon ? "kmicon_32.png" : undefined}
                accessories={triggers}
                actions={<MacroActionPanel macro={macro} revalidate={revalidate} />}
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
