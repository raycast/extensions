import { Action, ActionPanel, Icon, LaunchProps, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import plist from "plist";

type TypeMacro = Partial<{
  name: string;
  uid: string;
  active: boolean;
  created: number;
  used: number;
  enabled: boolean;
  lastused: number;
  modified: number;
  saved: number;
  sort: string;
  triggers: Array<Partial<{ description: string; short: string; type: string }>>;
}>;

type TypeMacroGroup = Partial<{
  uid: string;
  enabled: boolean;
  name: string;
  sort: string;
  macros: TypeMacro[];
}>;

interface Arguments {
  name?: string;
}

interface Preferences {
  displayShortcuts: boolean;
  displayTriggers: boolean;
  displayIcon: boolean;
  filterPattern: string;
  useRegex: boolean;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [data, setData] = useState<TypeMacroGroup[]>();
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();

  async function init() {
    try {
      const scriptResult = await runAppleScript(`tell application "Keyboard Maestro Engine"
          set macroList to getmacros with asstring
          end tell`);
      const data = plist.parse(scriptResult) as TypeMacroGroup[];

      // Filtering groups with filter pattern and enabled groups
      const filterPattern = preferences.filterPattern.trim();
      const hasFilter = filterPattern !== "";
      let matchFunction: (groupName: string) => boolean;

      if (hasFilter) {
        if (filterPattern.startsWith('"') && filterPattern.endsWith('"')) {
          const exactMatch = filterPattern.slice(1, -1).toLowerCase();
          matchFunction = (groupName) => groupName.toLowerCase() === exactMatch;
        } else if (preferences.useRegex) {
          let regexPattern: RegExp;
          try {
            regexPattern = new RegExp(filterPattern, "i");
          } catch (e) {
            showToast({ style: Toast.Style.Failure, title: "Error", message: "Invalid regular expression" });
            return;
          }
          matchFunction = (groupName) => regexPattern.test(groupName);
        } else {
          const partialMatch = filterPattern.toLowerCase();
          matchFunction = (groupName) => groupName.toLowerCase().includes(partialMatch);
        }
      } else {
        matchFunction = () => true;
      }

      // Filtering groups with enabled macros
      const filteredData = data
        .filter((group) => group.enabled && group.name && matchFunction(group.name))
        .map((group) => {
          const macros = group.macros?.filter((macro) => macro.enabled);
          return { ...group, macros };
        });
      setData(filteredData);
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Unable to list Macros" });
    } finally {
      setIsLoading(false);
    }
  }

  function editMacro(macro: TypeMacro) {
    runAppleScript(
      `tell application "Keyboard Maestro"
        editMacro "${macro.uid}"
        activate
      end tell`
    );
  }

  useEffect(() => {
    init();
  }, []);

  const [searchText, setSearchText] = useState(props.arguments.name ?? "");
  const [filteredList, filterList] = useState(data);

  const displayTypes: string[] = [];
  if (preferences.displayTriggers) {
    displayTypes.push("Typed String Trigger");
  }
  if (preferences.displayShortcuts) {
    displayTypes.push("Hot Key Trigger");
  }

  useEffect(() => {
    filterList(
      data?.map((item) => {
        const macros = item.macros?.filter((o) => o.name?.toLowerCase().includes(searchText.toLowerCase()));
        return { ...item, macros };
      })
    );
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
                title={macro?.name ?? ""}
                icon={preferences.displayIcon ? "kmicon_32.png" : undefined}
                accessories={triggers}
                actions={
                  <ActionPanel>
                    <Action.Open title="Run Macro" target={`kmtrigger://macro=${macro.uid}`} icon={Icon.Terminal} />
                    <Action
                      title="Edit Macro"
                      onAction={() => {
                        editMacro(macro);
                      }}
                      icon={Icon.Pencil}
                      shortcut={{ key: "e", modifiers: ["cmd"] }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
