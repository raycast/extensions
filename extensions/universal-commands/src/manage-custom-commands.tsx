import * as React from "react";
import { Action, ActionPanel, List, getFrontmostApplication, getPreferenceValues, LocalStorage } from "@raycast/api";
import { applicationShortcutRaiseHandForMeet, applicationShortcutRecordToggleMute } from "./mock";
import { CommandRecord } from "./types";
import { compareIsAppMatches, getActiveTabUrl, isCurrentAppBrowser } from "./utils";
import { CreateCustomCommandAction } from "./create-custom-command/create-custom-command.action";
import { RemoveCustomCommandAction } from "./remove-custom-command/remove-custom-command.action";
import { EditCustomCommandAction } from "./edit-cusom-command/edit-custom-command.action";

const DEEP_LINK = "raycast://extensions/cyxn/universal-commands/run-custom-command";

function composeFullUrl(id: string): string {
  const args = {
    id,
  };

  const result = encodeURIComponent(JSON.stringify(args));
  return `${DEEP_LINK}?arguments=${result}`;
}

type State = {
  isLoading: boolean;
  searchText: string;
  frontmostApplicationName: string;
  activeTabUrl: URL | null;
  filter: string; // store it to state
};

export default function Command({ isRunPrimary }: { isRunPrimary?: boolean }) {
  const { browser } = getPreferenceValues();
  const [state, setState] = React.useState<State>({
    isLoading: true,
    searchText: "",
    filter: "",
    frontmostApplicationName: "",
    activeTabUrl: null,
  });
  const [commands, setCommands] = React.useState<CommandRecord[]>([]);

  React.useEffect(() => {
    (async () => {
      const allCommandsRaw = await LocalStorage.allItems();

      const allCommands = Object.keys(allCommandsRaw).reduce<CommandRecord[]>((commands, id) => {
        commands.push(JSON.parse(allCommandsRaw[id]));
        return commands;
      }, []);

      const frontmostApplication = await getFrontmostApplication();

      const { name: frontmostApplicationName } = frontmostApplication;
      const isInBrowserNow = isCurrentAppBrowser({
        frontmostApplicationName,
        preferenceBrowserName: browser?.name || "",
      });
      let activeTabUrl: State["activeTabUrl"] = null;
      if (isInBrowserNow) {
        activeTabUrl = await getActiveTabUrl(frontmostApplicationName);
      }

      const storedData = [applicationShortcutRaiseHandForMeet, applicationShortcutRecordToggleMute, ...allCommands];

      setCommands(storedData);
      setState((previous) => ({ ...previous, isLoading: false, frontmostApplicationName, activeTabUrl }));
    })();
  }, []);

  const filteredCommands = React.useMemo(() => {
    const filtered = commands.filter((command) => {
      const includes = command.name.toLowerCase().includes(state.searchText.toLowerCase());
      return includes;
    });
    filtered.sort((a, b) => {
      const aIsAppFound = a.shortcuts.some((shortcut) =>
        compareIsAppMatches({
          shortcut,
          activeTabUrl: state.activeTabUrl,
          frontmostApplicationName: state.frontmostApplicationName,
        }),
      );
      const bIsAppFound = b.shortcuts.some((shortcut) =>
        compareIsAppMatches({
          shortcut,
          activeTabUrl: state.activeTabUrl,
          frontmostApplicationName: state.frontmostApplicationName,
        }),
      );
      if (aIsAppFound && !bIsAppFound) {
        return -1; // a should come before b
      } else if (!aIsAppFound && bIsAppFound) {
        return 1; // b should come before a
      } else {
        return 0; // a and b are equal in terms of matching
      }
    });

    return filtered;
  }, [commands, state.filter, state.searchText]);
  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      <List.EmptyView
        title="No matching resource found"
        description={`Can't find a resource matching "${state.searchText}\nCreate it now!`}
        actions={<ActionPanel></ActionPanel>}
      />
      {filteredCommands.map((command) => {
        const { id, name, shortcuts } = command;
        const setOfApps = shortcuts.reduce<string[]>((listOfApps, shortcut) => {
          if (shortcut.type === "web") {
            listOfApps.push(`🌐 ${shortcut.websiteUrl}`);
          }
          if (shortcut.type === "app") {
            listOfApps.push(shortcut.applicationName);
          }
          return listOfApps;
        }, []);

        return (
          <List.Item
            id={id}
            key={id}
            title={name}
            subtitle={setOfApps.join(", ")}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {isRunPrimary && (
                    <Action.OpenInBrowser
                      title="Run"
                      url={`raycast://extensions/cyxn/universal-commands/run-custom-command?arguments=${encodeURIComponent(JSON.stringify({ id }))}`}
                    />
                  )}
                  <Action.CreateQuicklink
                    quicklink={{
                      link: composeFullUrl(id),
                    }}
                  />
                  {isRunPrimary ? null : (
                    <Action.OpenInBrowser
                      title="Run"
                      url={`raycast://extensions/cyxn/universal-commands/run-custom-command?arguments=${encodeURIComponent(JSON.stringify({ id }))}`}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <CreateCustomCommandAction />
                  <EditCustomCommandAction id={id} />
                  <RemoveCustomCommandAction id={id} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
