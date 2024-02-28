import { Action, ActionPanel, clearSearchBar, List } from "@raycast/api";
import Auth from "./Auth";
import { useContext, useLayoutEffect } from "react";
import { useCommandPallette, Command, SiteFunctions } from "../hooks/useCommandPallette";
import { SiteContext } from "./SitesView";
import SitesView from "./SitesView";

export const ROOT_COMMAND_ID = "rootCommand";

export function generateRootCommand(siteFunctions: SiteFunctions) {
  const ROOT_COMMAND = [
    {
      name: ROOT_COMMAND_ID,
      label: "Root Command",
      callback: async () => {
        return undefined;
      },
      siteFunctions: siteFunctions,
    },
  ];
  return ROOT_COMMAND;
}

const CommandHandler = ({ commands = [] }: { commands: Command[] }) => {
  const { sites, selectedCommand, setSelectedCommand } = useContext(SiteContext);
  const { commands: filteredCommands } = useCommandPallette({
    sites,
    commands,
    selectedCommandName: selectedCommand?.name ? selectedCommand.name : null,
  });
  return (
    <>
      {filteredCommands
        ?.filter((command) => command.name !== ROOT_COMMAND_ID)
        .map((item) => (
          <List.Item
            id={item.name}
            key={item.name}
            title={item.label}
            subtitle={item.subLabel}
            icon={item.icon}
            actions={
              <ActionPanel>
                <Action
                  onAction={() => {
                    setSelectedCommand(item);
                    if (item.siteFunctions) {
                      return clearSearchBar().then(() => item.callback());
                    }
                    item.callback();
                  }}
                  title={item.label}
                />
              </ActionPanel>
            }
          />
        ))}
    </>
  );
};

export const RootCommand = ({ commands }: { commands: Command[] }) => {
  const { setSelectedCommand } = useContext(SiteContext);

  useLayoutEffect(() => {
    setSelectedCommand(commands.find((c) => c.name === ROOT_COMMAND_ID) ?? null);
  }, []);

  return <CommandHandler commands={commands} />;
};

export default function ViewCommandHandler({ commands }: { commands: Command[] }) {
  return (
    <Auth>
      <SitesView>
        <RootCommand commands={commands} />
      </SitesView>
    </Auth>
  );
}
