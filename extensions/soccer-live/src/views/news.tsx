import { List, LocalStorage, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import getNews from "../utils/getNews";
import { ALL_LEAGUES } from "../utils/leagueConstants";

export default function News() {
  const [currentLeague, setCurrentLeague] = useState("ENG.1");
  const { articleData, articleLoading, articleRevalidate } = getNews(currentLeague);

  useEffect(() => {
    async function loadStoredLeague() {
      const storedValue = await LocalStorage.getItem("soccerNewsLeague");
      if (typeof storedValue === "string") {
        setCurrentLeague(storedValue);
      }
    }
    loadStoredLeague();
  }, []);

  const handleLeagueChange = async (leagueCode: string) => {
    setCurrentLeague(leagueCode);
    await LocalStorage.setItem("soccerNewsLeague", leagueCode);
  };

  const articles = articleData?.articles || [];

  return (
    <List
      searchBarPlaceholder="Search for an article"
      searchBarAccessory={
        <List.Dropdown tooltip="Select League" onChange={handleLeagueChange} value={currentLeague}>
          {ALL_LEAGUES.map((league) => (
            <List.Dropdown.Item key={league.code} title={league.name} value={league.code} />
          ))}
        </List.Dropdown>
      }
      isLoading={articleLoading}
      filtering={true}
    >
      {articles.length > 0 ? (
        articles.map((article, index) => {
          const articleDate = new Date(article.published).toLocaleDateString([], {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          let articleType = article.type ?? "Unknown";
          if (articleType === "HeadlineNews") {
            articleType = "Headline";
          }

          return (
            <List.Item
              key={article.id || index}
              title={article.headline}
              subtitle={article.description || articleDate}
              icon={{
                source:
                  article.images?.[0]?.url ||
                  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`,
              }}
              accessories={[
                { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone, tooltip: "Category" },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Read Article on Espn"
                    url={article.links?.web?.href || `https://www.espn.com/soccer/${currentLeague}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Article Link"
                    content={article.links?.web?.href || `https://www.espn.com/soccer/${currentLeague}`}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={articleRevalidate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView icon="soccer-field.png" title="No News Available" />
      )}
    </List>
  );
}
