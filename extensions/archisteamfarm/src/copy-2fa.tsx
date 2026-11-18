import { Action, ActionPanel, Icon, Image, List, showToast, Toast, Clipboard, showHUD, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { getBots, get2FAToken, Bot } from "./utils/api";

export default function Command() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBots() {
      try {
        const botsData = await getBots();
        const botList = Object.values(botsData);
        setBots(botList);

        // Fetch 2FA for all bots that might have it (mock check or just try all)
        // Usually we don't spam 2FA requests unless requested, but for "Copy 2FA" command, we probably want to see them.
        // However, generating tokens might be time sensitive or rate limited?
        // Let's just list the bots and fetch token on demand or fetch all if list is small.
        // Better UX: List bots. "Enter" to copy.
        // Optionally, display the code in the list as accessory if possible.
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch bots",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBots();
  }, []);

  const copyToken = async (botName: string) => {
    try {
      showToast({ style: Toast.Style.Animated, title: `Fetching 2FA for ${botName}...` });
      const token = await get2FAToken(botName);
      if (token) {
        await Clipboard.copy(token);
        await showHUD("Copied 2FA Token");
        await popToRoot();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No 2FA Token found",
          message: `Bot ${botName} may not have 2FA.`,
        });
      }
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Error fetching 2FA", message: String(e) });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bots...">
      {bots.map((bot) => (
        <List.Item
          key={bot.BotName}
          title={bot.BotName}
          subtitle={bot.Nickname || undefined}
          icon={
            bot.AvatarHash
              ? { source: `https://avatars.steamstatic.com/${bot.AvatarHash}_full.jpg`, mask: Image.Mask.Circle }
              : bot.IsConnectedAndLoggedOn
                ? Icon.CheckCircle
                : Icon.Circle
          }
          accessories={[{ text: bot.IsConnectedAndLoggedOn ? "Online" : "Offline" }]}
          actions={
            <ActionPanel>
              <Action title="Copy 2FA Token" icon={Icon.CopyClipboard} onAction={() => copyToken(bot.BotName)} />
              <Action.CopyToClipboard content={bot.SteamID || ""} title="Copy Steam ID" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
