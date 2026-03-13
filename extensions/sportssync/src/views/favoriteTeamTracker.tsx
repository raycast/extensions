import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

interface Article {
  headline: string;
  published: string;
  byline?: string;
  description?: string;
  type: string;
  images: { url: string }[];
  links: { web: { href: string } };
}

interface ArticleDayItems {
  title: string;
  articles: JSX.Element[];
}

interface ArticlesResponse {
  articles: Article[];
}

interface Address {
  city: string;
  state: string;
  country: string;
}

interface Venue {
  fullName: string;
  address: Address;
}

interface Team {
  id: string;
  displayName: string;
  nickname: string;
  abbreviation: string;
  venue: Venue;
  logos: { href: string }[];
  links: { href: string }[];
}

interface TeamStats {
  name: string;
  displayValue: string;
  summary: string;
}

interface StandingsTeam {
  team: Team;
  stats: TeamStats[];
  athlete: Athlete[];
}

interface StandingsData {
  standings: {
    entries: StandingsTeam[];
  };
}

interface Athlete {
  displayName: string;
  position: { displayName: string };
  team: Team;
  flag: { href: string };
  links: { href: string }[];
}

interface Injury {
  injuries: Injury[];
  athlete: Athlete;
  status: string;
  details?: { returnDate: string };
}

interface InjuryResponse {
  season: { displayName: string };
  injuries: Injury[];
}

interface Transaction {
  date: string;
  description: string;
  team: Team;
}

interface TransactionDayItems {
  title: string;
  transactions: JSX.Element[];
}

interface Franchise {
  team: Team;
}

interface TransactionResponse {
  transactions: Transaction[];
}

const favoriteTeam = getPreferenceValues().team as string;
const favoriteLeague = getPreferenceValues().league as string;
const favoriteSport = getPreferenceValues().sport as string;

export default function TeamInjuries() {
  // Fetch Team Information

  const { isLoading: franchiseLoading, data: franchiseData } = useFetch<Franchise>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/teams/${favoriteTeam}`,
  );

  const { isLoading, data, revalidate } = useFetch<StandingsData>(
    `https://site.web.api.espn.com/apis/v2/sports/${favoriteSport}/${favoriteLeague}/standings?level=1&sort=playoffseed:asc,points:desc,gamesplayed:asc`,
  );

  const teamPositionItems = data?.standings?.entries ?? [];

  const findStat = (stats: { name: string; displayValue: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.displayValue ?? "0";

  const findRecord = (stats: { name: string; summary: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.summary ?? "0-0";

  const teamPosition = teamPositionItems.map((team1, index) => {
    let playoffPosition = 0;

    let tagColor;
    let tagIcon;
    let tagTooltip;

    let stat1;
    let stat2;
    let stat3;
    let stat4;
    let stat5;

    if (favoriteLeague === "nhl") {
      stat1 = `${findStat(team1?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team1?.stats, "overall")} |`;
      stat3 = `${findStat(team1?.stats, "points")} pts |`;
      stat4 = `GF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat5 = `GA: ${findStat(team1?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed"));
    }

    if (favoriteLeague === "nba") {
      stat1 = `${findRecord(team1?.stats, "League Standings")} |`;
      stat2 = `Pct: ${(Number(findStat(team1?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team1?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team1?.stats, "differential")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    if (favoriteLeague === "wnba") {
      stat1 = `${findRecord(team1?.stats, "League Standings")} |`;
      stat2 = `Pct: ${(Number(findStat(team1?.stats, "leagueWinPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team1?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team1?.stats, "differential")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    if (favoriteLeague === "nfl") {
      stat1 = `${findRecord(team1?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team1?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team1?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team1?.stats, "differential")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    if (favoriteLeague === "mlb") {
      stat1 = `${findStat(team1?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team1?.stats, "overall")} |`;
      stat3 = `Pct: ${(Number(findStat(team1?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat4 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat5 = `PA: ${findStat(team1?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    const flagSrc = team1?.athlete?.[0]?.flag?.href ?? `${team1?.athlete?.[0]?.flag?.href}`;

    if (favoriteSport === "soccer") {
      stat1 = `${findStat(team1?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team1?.stats, "overall")} |`;
      stat3 = `${findStat(team1?.stats, "points")} pts |`;
      stat4 = `GF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat5 = `GA: ${findStat(team1?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team1?.stats, "rank"));
    }

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 8) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 9 && playoffPosition <= 14) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 15) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    if (favoriteLeague === "nba") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 8) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 9 && playoffPosition <= 14) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 15) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (favoriteLeague === "wnba") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 4) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 4 && playoffPosition <= 5) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 6) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (favoriteSport === "football") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 7) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 8 && playoffPosition <= 15) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 16) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (favoriteSport === "baseball") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 6) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 7 && playoffPosition <= 14) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 15) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (favoriteSport === "soccer") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
      } else if (playoffPosition >= 2) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (team1.team.id === `${favoriteTeam}`)
      return (
        <List.Item
          key={index}
          title={`${team1?.team?.displayName ?? "Unknown"}`}
          icon={{
            source:
              team1?.team?.logos?.[0]?.href ??
              flagSrc ??
              `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${favoriteLeague}.png&w=100&h=100&transparent=true`,
          }}
          accessories={[
            {
              text: `${stat1} ${stat2} ${stat3} ${stat4} ${stat5}`,
            },
            {
              tag: { value: `${playoffPosition}`, color: tagColor },
              icon: tagIcon,
              tooltip: tagTooltip,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`View ${team1?.team?.displayName} Details on ESPN`}
                url={`${team1?.team?.links[0]?.href ?? `https://www.espn.com/${favoriteLeague}`}`}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              ></Action>
            </ActionPanel>
          }
        />
      );
  });

  const {
    isLoading: articleLoading,
    data: articleData,
    revalidate: articleRevalidate,
  } = useFetch<ArticlesResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/news?limit=200`,
  );

  const articleDayItems: ArticleDayItems[] = [];
  const articles = articleData?.articles || [];

  articles?.forEach((article, index) => {
    const articleDate = new Date(article?.published ?? "Unknown").toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const articleHeadline = article?.headline ?? "No Headline Found";
    let articleType = article?.type ?? "Unknown";

    if (articleType === "HeadlineNews") {
      articleType = "Headline";
    }

    let articleDayItem = articleDayItems?.find((item) => item?.title === articleDate);

    if (!articleDayItem) {
      articleDayItem = { title: articleDate, articles: [] };
      articleDayItems.push(articleDayItem);
    }

    const favoriteTeamName = franchiseData?.team?.nickname ?? "Unknown";

    if (article.headline.includes(favoriteTeamName))
      articleDayItem?.articles.push(
        <List.Item
          key={index}
          title={`${articleHeadline}`}
          icon={{
            source:
              article?.images?.[0]?.url ??
              `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${favoriteLeague}.png&w=100&h=100&transparent=true`,
          }}
          accessories={[
            { tag: { value: articleType, color: Color.Green }, icon: Icon.Megaphone, tooltip: "Category" },
            { icon: Icon.Megaphone },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Article on ESPN"
                url={`${article?.links?.web?.href ?? `https://www.espn.com/${favoriteLeague}`}`}
              />
              <Action.CopyToClipboard
                title="Copy Article Link"
                content={`${article?.links?.web?.href ?? `https://www.espn.com/${favoriteLeague}`}`}
              ></Action.CopyToClipboard>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={articleRevalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              ></Action>
            </ActionPanel>
          }
        />,
      );
  });

  const {
    isLoading: injuryLoading,
    data: injuryData,
    revalidate: injuryRevalidate,
  } = useFetch<InjuryResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/injuries`,
  );

  const injuryItems = injuryData?.injuries.flatMap((injuryItem) => injuryItem.injuries) || [];
  const injuryArray = injuryItems?.map((injury, index) => {
    const articleDate = injury?.details?.returnDate ?? "";

    if (!articleDate) {
      return null;
    }

    let tagColor = Color.SecondaryText;
    let accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.SecondaryText };

    if (injury.status === "Day-To-Day") {
      tagColor = Color.Yellow;
      accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.Yellow };
    }

    if (injury.status === "Out") {
      tagColor = Color.Orange;
      accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.Orange };
    }

    if (injury.status === "Injured Reserve" || injury.status === "Questionable" || injury.status.includes("Day-IL")) {
      tagColor = Color.Red;
      accessoryIcon = { source: Icon.MedicalSupport, tintColor: Color.Red };
    }

    if (injury.status === "Suspension") {
      tagColor = Color.Orange;
      accessoryIcon = { source: Icon.Warning, tintColor: Color.Orange };
    }

    if (injury.athlete.team.id === `${favoriteTeam}`)
      return (
        <List.Item
          key={index}
          title={`${injury.athlete.displayName}`}
          subtitle={`${injury.athlete.position.displayName}`}
          icon={{ source: injury.athlete.team.logos[0].href }}
          accessories={[
            {
              tag: { value: injury.status.replace(/-/g, " "), color: tagColor },
              tooltip: "Status",
            },
            { text: articleDate, tooltip: "Est. Return Date" },
            { icon: accessoryIcon },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`View ${injury.athlete.displayName} Details on ESPN`}
                url={`${injury.athlete.links[0]?.href ?? "https://www.espn.com"}`}
              />
              <Action.OpenInBrowser
                title={`View ${injury.athlete.team.displayName} Details on ESPN`}
                url={`${injury.athlete.team.links[0]?.href ?? "https://www.espn.com"}`}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={injuryRevalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              ></Action>
            </ActionPanel>
          }
        />
      );
  });

  const {
    isLoading: transactionLoading,
    data: transactionsData,
    revalidate: transactionRevalidate,
  } = useFetch<TransactionResponse>(
    `https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/transactions?limit=200`,
  );

  const transactionDayItems: TransactionDayItems[] = [];
  const transactions = transactionsData?.transactions || [];

  transactions?.map((transaction, index) => {
    const transactionDate = new Date(transaction.date ?? "Unknown").toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const transactionDay = transactionDate;

    let transactionDayItem = transactionDayItems.find((item) => item.title === transactionDay);

    if (!transactionDayItem) {
      transactionDayItem = { title: transactionDay, transactions: [] };
      transactionDayItems.push(transactionDayItem);
    }

    if (transaction.team.id === `${favoriteTeam}`)
      transactionDayItem?.transactions.push(
        <List.Item
          key={index}
          title={`${transaction?.description ?? "Unknown"}`}
          icon={{ source: transaction?.team.logos[0]?.href }}
          accessories={[{ icon: Icon.Switch }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={`View ${transaction?.team?.displayName ?? "Team"} Details on ESPN`}
                url={`${transaction?.team.links[0]?.href ?? "https://www.espn.com"}`}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={transactionRevalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              ></Action>
            </ActionPanel>
          }
        />,
      );
  });

  if (isLoading || franchiseLoading || injuryLoading || transactionLoading || articleLoading) {
    return <Detail isLoading={true} />;
  }

  if (
    !data ||
    !injuryData ||
    !transactionsData ||
    injuryArray.length === 0 ||
    articleDayItems.length === 0 ||
    transactionDayItems.length === 0
  ) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <>
      <List.Section title="Team Standings">{teamPosition}</List.Section>

      {<List.Section title="Injury Status">{injuryArray}</List.Section>}

      {articleDayItems.map((articleDayItem, index) => (
        <List.Section
          key={index}
          title={`Article${articleDayItem?.articles?.length !== 1 ? "s" : ""}`}
          subtitle={`${articleDayItem?.title ?? "Articles"}`}
        >
          {articleDayItem?.articles}
        </List.Section>
      ))}

      {transactionDayItems.map((transactionDayItem, index) => (
        <List.Section
          key={index}
          title={`Transaction${transactionDayItem?.transactions?.length !== 1 ? "s" : ""}`}
          subtitle={`${transactionDayItem.title}`}
        >
          {transactionDayItem?.transactions}
        </List.Section>
      ))}
    </>
  );
}
