import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorModel } from "./interface/ErrorModel";
import { GamesModel } from "./interface/GameModel";

export default function MyGames() {
  const API_KEY = getPreferenceValues<Preferences.MyGames>().api_key;

  const { isLoading, data: games } = useFetch(`https://itch.io/api/1/key/my-games`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    mapResult(result: ErrorModel | GamesModel) {
      if ("errors" in result) throw new Error(result.errors[0]);
      const games = result.games instanceof Array ? result.games : [];
      return {
        data: games,
      };
    },
    initialData: [],
  });
  const noGames = !isLoading && !games.length;

  return (
    <List isLoading={isLoading} isShowingDetail={!noGames}>
      {noGames ? (
        <List.EmptyView
          title="No Games Found"
          description="Why not add your first game now?"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.ArrowNe} title="Upload New Project" url="https://itch.io/game/new" />
            </ActionPanel>
          }
        />
      ) : (
        games.map((game) => (
          <List.Item
            key={game.id}
            icon={{ source: Icon.GameController, tintColor: game.published ? Color.Green : Color.Blue }}
            title={game.title}
            accessories={[{ date: new Date(game.created_at) }]}
            detail={
              <List.Item.Detail
                markdown={`![${game.title}](${game.cover_url})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="ID" text={game.id.toString()} />
                    <List.Item.Detail.Metadata.Label title="Title" text={game.title} />
                    <List.Item.Detail.Metadata.Link title="URL" text={game.url} target={game.url} />
                    <List.Item.Detail.Metadata.Label title="Type" text={game.type} />
                    <List.Item.Detail.Metadata.Label title="Classification" text={game.classification} />
                    <List.Item.Detail.Metadata.Label title="Min Price" text={game.min_price.toString()} />
                    <List.Item.Detail.Metadata.TagList title="Other">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Has Demo"
                        color={game.has_demo ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Can Be Bought"
                        color={game.can_be_bought ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="In Press System"
                        color={game.in_press_system ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Platforms">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Android"
                        color={game.p_android ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="OS X"
                        color={game.p_osx ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Windows"
                        color={game.p_windows ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Linux"
                        color={game.p_linux ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.TagList title="Statistics">
                      <List.Item.Detail.Metadata.TagList.Item text={`Purchases: ${game.purchases_count.toString()}`} />
                      <List.Item.Detail.Metadata.TagList.Item text={`Views: ${game.views_count.toString()}`} />
                      <List.Item.Detail.Metadata.TagList.Item text={`Downloads: ${game.downloads_count.toString()}`} />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="Edit Game"
                  url={`https://itch.io/game/edit/${game.id}`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
