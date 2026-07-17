import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { ToggleDetailsAction } from "../../shared/actions";
import { SUPPORTED_CLIENTS } from "../../shared/mcp";
import { RegistryProps } from "../types";
import { COMMUNITY_ENTRIES, OFFICIAL_ENTRIES } from "./entries";
import { getAccessories } from "./utils";
import { InstallServerToClientAction } from "./actions";
import { RegistryEntry } from "./types";
import { useApplications } from "../../shared/application";
import { useMemo } from "react";

export function OfficialRegistry(props: RegistryProps) {
  return <Registry {...props} entries={OFFICIAL_ENTRIES} />;
}

export function CommunityRegistry(props: RegistryProps) {
  return <Registry {...props} entries={COMMUNITY_ENTRIES} />;
}

function Registry(props: RegistryProps & { entries: RegistryEntry[] }) {
  const { data } = useApplications();

  const installedClients = useMemo(
    () => SUPPORTED_CLIENTS.filter((client) => data?.some((app) => app.bundleId === client.bundleId)),
    [data],
  );

  return (
    <>
      {props.entries
        .filter((entry) => entry.title.toLowerCase().includes(props.searchText?.toLowerCase() ?? ""))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((entry) => (
          <List.Item
            key={entry.name}
            icon={entry.icon}
            title={entry.title}
            subtitle={props.isShowingDetail ? undefined : entry.description}
            accessories={getAccessories(entry)}
            detail={
              <List.Item.Detail
                markdown={`# ${entry.title}\n\n${entry.description}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    {entry.homepage && (
                      <List.Item.Detail.Metadata.Link
                        title="Homepage"
                        text={new URL(entry.homepage).hostname}
                        target={entry.homepage}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={"command" in entry.configuration ? "stdio" : "SSE"}
                    />
                    <List.Item.Detail.Metadata.Label title="Command" text={entry.configuration.command} />
                    {entry.configuration.args && (
                      <List.Item.Detail.Metadata.TagList title="Arguments">
                        {entry.configuration.args.map((arg) => (
                          <List.Item.Detail.Metadata.TagList.Item key={arg} text={arg} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {entry.configuration.env && (
                      <List.Item.Detail.Metadata.TagList title="Environment">
                        {Object.entries(entry.configuration.env).map(([key]) => (
                          <List.Item.Detail.Metadata.TagList.Item key={key} text={key} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <ActionPanel.Submenu icon={Icon.ArrowDownCircle} title="Install Server">
                    <Action.InstallMCPServer
                      icon={{
                        source: {
                          light: Icon.RaycastLogoPos,
                          dark: Icon.RaycastLogoNeg,
                        },
                      }}
                      title="Raycast"
                      server={{
                        transport: "stdio",
                        icon:
                          typeof entry.icon === "string" && Object.values(Icon).includes(entry.icon as Icon)
                            ? (entry.icon as Icon)
                            : undefined,
                        name: entry.title,
                        description: entry.description,
                        command: entry.configuration.command,
                        args: entry.configuration.args,
                        env: entry.configuration.env,
                      }}
                    />
                    <ActionPanel.Section>
                      {installedClients.map((client) => (
                        <InstallServerToClientAction key={client.bundleId} registryEntry={entry} client={client} />
                      ))}
                    </ActionPanel.Section>
                  </ActionPanel.Submenu>
                </ActionPanel.Section>
                {entry.homepage && (
                  <Action.OpenInBrowser url={entry.homepage} shortcut={Keyboard.Shortcut.Common.Open} />
                )}
                <ToggleDetailsAction
                  isShowingDetail={props.isShowingDetail}
                  setShowingDetail={props.setShowingDetail}
                />
              </ActionPanel>
            }
          />
        ))}
    </>
  );
}
