import { Action, ActionPanel, Icon, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { GameDataSimple } from "../types";
import { MyGames } from "./MyGames";
import { RandomGamesList } from "./RandomGamesList";
import { RecentlyPlayedGames } from "./RecentlyPlayedGames";

export const DefaultActions = () => {
  const { push, pop } = useNavigation();
  // Reset to top level to avoid deeply nested navigation
  const replaceWith = (view: JSX.Element) => {
    pop();
    push(view);
  };
  return (
    <ActionPanel.Section title="Common Commands">
      <Action title="View My Games" icon={Icon.List} onAction={() => replaceWith(<MyGames />)} />
      <Action
        icon={Icon.List}
        title="View Most Played Games"
        onAction={() =>
          replaceWith(
            <MyGames
              sortBy="playtime_forever"
              extraFilter={(g: GameDataSimple) => Boolean(g.playtime_forever)}
              order="desc"
            />
          )
        }
      />
      <Action
        icon={Icon.List}
        title="View Recently Played Games"
        onAction={() => replaceWith(<RecentlyPlayedGames />)}
      />
      <Action icon={Icon.List} title="View Random Games" onAction={() => replaceWith(<RandomGamesList />)} />
      <Action
        icon={Icon.XmarkCircle}
        title="Clear Recent History"
        onAction={async () => {
          await LocalStorage.clear();
          await showToast({
            title: "Success. Reload to see changes",
            style: Toast.Style.Success,
          });
        }}
      />
    </ActionPanel.Section>
  );
};

export const LaunchActions = ({ appid = 0 }) => {
  if (!appid) return null;
  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="View In Browser" url={`https://store.steampowered.com/app/${appid}`} />
      <Action.OpenInBrowser icon={Icon.Binoculars} title="View On SteamDB" url={`https://steamdb.info/app/${appid}`} />
      <Action.OpenInBrowser icon={Icon.Window} title="View In Steam" url={`steam://nav/games/details/${appid}`} />
      <Action.OpenInBrowser icon={Icon.Window} title="Open Store Page In Steam" url={`steam://store/${appid}`} />
      <Action.OpenInBrowser icon={Icon.ArrowRight} title="Launch Game" url={`steam://rungameid/${appid}`} />
      <Action.OpenInBrowser icon={Icon.Download} title="Install Game" url={`steam://install/${appid}`} />
    </ActionPanel.Section>
  );
};
