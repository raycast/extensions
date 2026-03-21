import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getBots, Bot, pauseBot, resumeBot, startBot, stopBot, sendCommand } from "./utils/api";

export default function Command() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchBots = useCallback(async () => {
    setIsLoading(true);
    try {
      const botsData = await getBots();
      setBots(Object.values(botsData));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch bots",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
  }, [fetchBots, refreshTrigger]);

  const refresh = () => setRefreshTrigger((t) => t + 1);

  const handleBotAction = async (actionName: string, actionFn: () => Promise<unknown>) => {
    try {
      await showToast({ style: Toast.Style.Animated, title: `${actionName}...` });
      await actionFn();
      await showToast({ style: Toast.Style.Success, title: `${actionName} success` });
      refresh();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: `${actionName} failed`, message: String(e) });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bots or commands..." isShowingDetail>
      <List.Section title="Bots">
        {bots.map((bot) => (
          <List.Item
            key={bot.BotName}
            title={bot.BotName}
            icon={
              bot.AvatarHash
                ? {
                    source: `https://avatars.steamstatic.com/${bot.AvatarHash}_full.jpg`,
                    mask: Image.Mask.Circle,
                  }
                : bot.IsConnectedAndLoggedOn
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.XMarkCircle, tintColor: Color.Red }
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Bot Name" text={bot.BotName} />
                    <List.Item.Detail.Metadata.Label title="Nickname" text={bot.Nickname || "-"} />
                    <List.Item.Detail.Metadata.Label
                      title="Steam ID"
                      text={bot.SteamID ? bot.SteamID.toString() : "-"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={bot.IsConnectedAndLoggedOn ? "Online" : "Offline"}
                        color={bot.IsConnectedAndLoggedOn ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text={bot.KeepRunning ? "Running" : "Stopped"}
                        color={bot.KeepRunning ? Color.Green : Color.Orange}
                      />
                      {bot.CardsFarmer.Paused && (
                        <List.Item.Detail.Metadata.TagList.Item text="Farming Paused" color={Color.Yellow} />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    {bot.CardsFarmer.CurrentGamesFarming.length > 0 && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Farming" />
                        {bot.CardsFarmer.CurrentGamesFarming.map((game) => (
                          <List.Item.Detail.Metadata.Label
                            key={game.AppID}
                            title={game.GameName}
                            text={`${game.CardsRemaining} cards`}
                          />
                        ))}
                        <List.Item.Detail.Metadata.Label title="Time Remaining" text={bot.CardsFarmer.TimeRemaining} />
                      </>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {bot.CardsFarmer.Paused ? (
                    <Action
                      title="Resume Farming"
                      icon={Icon.Play}
                      onAction={() => handleBotAction(`Resuming ${bot.BotName}`, () => resumeBot(bot.BotName))}
                    />
                  ) : (
                    <Action
                      title="Pause Farming"
                      icon={Icon.Pause}
                      onAction={() => handleBotAction(`Pausing ${bot.BotName}`, () => pauseBot(bot.BotName, true))}
                    />
                  )}
                  {bot.KeepRunning ? (
                    <Action
                      title="Stop Bot"
                      style={Action.Style.Destructive}
                      icon={Icon.Stop}
                      onAction={() => handleBotAction(`Stopping ${bot.BotName}`, () => stopBot(bot.BotName))}
                    />
                  ) : (
                    <Action
                      title="Start Bot"
                      icon={Icon.Play}
                      onAction={() => handleBotAction(`Starting ${bot.BotName}`, () => startBot(bot.BotName))}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Global Commands">
        <List.Item
          title="Update ASF"
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action title="Update" onAction={() => handleBotAction("Updating ASF", () => sendCommand("update"))} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restart ASF"
          icon={Icon.Power}
          actions={
            <ActionPanel>
              <Action
                title="Restart"
                style={Action.Style.Destructive}
                onAction={() => handleBotAction("Restarting ASF", () => sendCommand("restart"))}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
