import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useState, useEffect } from "react";
import { authorize, fetchServers } from "./oauth/discord";

export default function Command() {
  const [servers, setServers] = useState<
    {
      id: string;
      name: string;
      icon: string;
      memberCount: string | number;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadServers() {
      try {
        await authorize();
        const guilds = await fetchServers();

        console.log(guilds);

        setServers(
          guilds.map((guild) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon || Icon.Globe,
            memberCount: "?",
          })),
        );

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch servers from Discord:", error);
        setIsLoading(false);
      }
    }

    loadServers();
  }, []);

  return (
    <List isLoading={isLoading}>
      {servers.map((server) => (
        <List.Item
          key={server.id}
          icon={server.icon}
          title={server.name}
          //subtitle={`${server.memberCount} members`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Discord" url={`discord://discord.com/channels/${server.id}`} />
              <Action.CopyToClipboard title="Copy Server Id" content={server.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
