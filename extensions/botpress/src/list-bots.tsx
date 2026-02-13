import { ActionPanel, List, Action, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { Client, ClientOutputs } from "@botpress/client";

type Bot = ClientOutputs["listBots"]["bots"][number];

export default function Command() {
  const { pat, workspaceId } = getPreferenceValues<ExtensionPreferences>();
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBots() {
      try {
        const client = new Client({ token: pat, workspaceId });
        const allBots: Bot[] = [];
        let nextToken: string | undefined;

        do {
          const resp = await client.listBots({ nextToken });
          nextToken = resp.meta.nextToken;
          allBots.push(...resp.bots);
        } while (nextToken);

        setBots(allBots);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch bots",
          message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBots();
  }, [pat, workspaceId]);

  return (
    <List isLoading={isLoading}>
      {bots.map((bot) => (
        <List.Item
          key={bot.id}
          icon={Icon.ComputerChip}
          title={bot.name || "Unnamed Bot"}
          accessories={[{ date: new Date(bot.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Studio" url={`https://studio.botpress.cloud/${bot.id}`} />
              <Action.OpenInBrowser
                title="Open in Dashboard"
                url={`https://app.botpress.cloud/workspaces/${workspaceId}/chatbots/${bot.id}`}
              />
              <Action.CopyToClipboard title="Copy Bot ID" content={bot.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
