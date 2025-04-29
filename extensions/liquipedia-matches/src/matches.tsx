import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { getUpcomingMatches } from "./lib/getUpcomingMatches";
import { useCachedPromise } from "@raycast/utils";

export default function MatchesCommand() {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Twitch":
        return "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png";
      case "YouTube":
        return "https://www.youtube.com/favicon.ico";
      case "Kick":
        return "https://kick.com/favicon.ico";
      default:
        return Icon.Play;
    }
  };

  const { isLoading, data: matches } = useCachedPromise(getUpcomingMatches);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search upcoming matches...">
      {matches?.map((match, idx) => (
        <List.Item
          key={idx}
          title={`${match.team1} vs ${match.team2}`}
          accessories={[{ icon: match.team1Icon }, { text: match.time }, { icon: match.team2Icon }]}
          actions={
            match.streams.length > 0 ? (
              <ActionPanel>
                {match.streams.map((url, i) => {
                  const getPlatformName = (url: string) => {
                    if (url.includes("twitch")) return "Twitch";
                    if (url.includes("youtube")) return "YouTube";
                    if (url.includes("kick")) return "Kick";
                    return "Stream";
                  };

                  const platform = getPlatformName(url);

                  return (
                    <Action.OpenInBrowser
                      key={i}
                      url={url}
                      title={`Watch on ${platform}`}
                      icon={getPlatformIcon(platform)}
                    />
                  );
                })}
              </ActionPanel>
            ) : undefined
          }
        />
      ))}

      {!isLoading && (
        <List.Section title="Attribution">
          <List.Item
            key="liquipedia-attribution"
            title="Data provided by Liquipedia.net"
            icon="https://liquipedia.net/favicon.ico"
            accessories={[{ text: "CC-BY-SA 3.0" }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url="https://liquipedia.net" title="Visit Liquipedia" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
