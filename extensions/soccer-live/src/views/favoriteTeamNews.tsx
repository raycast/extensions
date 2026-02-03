import { List, Action, ActionPanel } from "@raycast/api";
import { useMemo } from "react";
import { FavoriteTeam } from "../utils/favoriteTeams";
import getNews from "../utils/getNews";

interface Props {
  favoriteTeams: FavoriteTeam[];
  dropdown: JSX.Element;
}

export default function TeamNewsView({ favoriteTeams, dropdown }: Props) {
  // Call all hooks at top level - fetch news for expanded list of leagues
  const engNews = getNews("ENG.1");
  const espNews = getNews("ESP.1");
  const gerNews = getNews("GER.1");
  const itaNews = getNews("ITA.1");
  const fraNews = getNews("FRA.1");
  const nedNews = getNews("NED.1");
  const porNews = getNews("POR.1");
  const belNews = getNews("BEL.1");
  const scoNews = getNews("SCO.1");
  const turNews = getNews("TUR.1");
  const uefaChampionsNews = getNews("uefa.champions");
  const uefaEuropaNews = getNews("uefa.europa");
  const uefaEuroNews = getNews("uefa.euro");
  const fifaWorldNews = getNews("fifa.world");
  const africaCupNews = getNews("africa.cup");

  const newsByLeague = useMemo(() => {
    return {
      "ENG.1": engNews,
      "ESP.1": espNews,
      "GER.1": gerNews,
      "ITA.1": itaNews,
      "FRA.1": fraNews,
      "NED.1": nedNews,
      "POR.1": porNews,
      "BEL.1": belNews,
      "SCO.1": scoNews,
      "TUR.1": turNews,
      "uefa.champions": uefaChampionsNews,
      "uefa.europa": uefaEuropaNews,
      "uefa.euro": uefaEuroNews,
      "fifa.world": fifaWorldNews,
      "africa.cup": africaCupNews,
    };
  }, [
    engNews.articleData,
    espNews.articleData,
    gerNews.articleData,
    itaNews.articleData,
    fraNews.articleData,
    nedNews.articleData,
    porNews.articleData,
    belNews.articleData,
    scoNews.articleData,
    turNews.articleData,
    uefaChampionsNews.articleData,
    uefaEuropaNews.articleData,
    uefaEuroNews.articleData,
    fifaWorldNews.articleData,
    africaCupNews.articleData,
  ]);

  return (
    <List searchBarPlaceholder="Search for an article" searchBarAccessory={dropdown} filtering={true}>
      {favoriteTeams.map((team) => {
        const { articleData, articleLoading } = newsByLeague[team.leagueCode] || {
          articleData: null,
          articleLoading: false,
        };
        const articles = articleData?.articles || [];

        return (
          <List.Section key={team.id} title={`${team.name} (${team.leagueName}) - News`}>
            {articleLoading ? (
              <List.Item title="Loading..." icon="soccer-field.png" />
            ) : articles.length > 0 ? (
              articles.slice(0, 10).map((article, index) => {
                const articleDate = new Date(article.published).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <List.Item
                    key={article.id || index}
                    title={article.headline}
                    subtitle={articleDate}
                    keywords={[
                      article.headline,
                      article.description || "",
                      team.name,
                      team.leagueName,
                      team.leagueCode,
                      articleDate,
                    ]}
                    icon={{
                      source:
                        article.images?.[0]?.url ||
                        team.logo ||
                        `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${team.leagueCode}.png&w=100&h=100&transparent=true`,
                    }}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          title="Read Article on Espn"
                          url={article.links?.web?.href || `https://www.espn.com/soccer/${team.leagueCode}`}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })
            ) : (
              <List.Item title="No News Available" icon="soccer-field.png" />
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
