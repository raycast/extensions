import { Action, ActionPanel, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
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

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [data, setData] = useState<TypeMacroGroup[]>();
  const [isLoading, setIsLoading] = useState(true);

  async function init() {
    try {
      const scriptResult = await runAppleScript(`tell application "Keyboard Maestro Engine"
          set macroList to getmacros with asstring
          end tell`);
      const data = plist.parse(scriptResult) as TypeMacroGroup[];
      setData(data);
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
      {filteredList
        ?.filter((o) => o.enabled)
        .map((group) => (
          <List.Section id={group.uid} title={group.name}>
            {group.macros
              ?.filter((o) => o.enabled)
              .map((macro) => (
                <List.Item
                  key={macro.uid}
                  id={macro.uid}
                  title={macro?.name ?? ""}
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
              ))}
          </List.Section>
        ))}
    </List>
  );
}
