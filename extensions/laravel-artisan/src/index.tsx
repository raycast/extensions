import { List, Icon, Action, ActionPanel, environment, AI } from "@raycast/api";
import { useState } from "react";
import { useVersions } from "./hooks/useVersions";
import { useCommands } from "./hooks/useCommands";
import { DetailsView } from "./components/DetailsView";
import { VersionSelect } from "./components/VersionSelect";
import { SummaryView } from "./components/SummaryView";

export default function Artisan() {
  const [version, setVersion] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const { versions } = useVersions();
  const { commands, isLoading } = useCommands({ version, search });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearch}
      throttle={true}
      searchBarPlaceholder="Search for a command..."
      searchBarAccessory={<VersionSelect versions={versions} setVersion={setVersion} />}
    >
      {commands?.map((command) => (
        <List.Item
          title={command.name}
          key={command.name + (search ?? "")}
          icon={{ source: Icon.Paragraph, tintColor: "#869aa8" }}
          detail={<DetailsView command={command} />}
          actions={
            <ActionPanel>
              {environment.canAccess(AI) ? (
                <Action.Push target={<SummaryView command={command} />} title="View Summary" />
              ) : null}
              {/* TODO: Not sure if we can append a space after the command */}
              <Action.CopyToClipboard title="Copy to Clipboard" content={command.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
