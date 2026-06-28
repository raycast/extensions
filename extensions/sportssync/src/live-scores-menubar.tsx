import { Icon, MenuBarExtra, LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";

// Get User Preferences

const preferences = getPreferenceValues<Preferences>();
const favoriteLeague = preferences.league;
const favoriteSport = preferences.sport;

// Types

interface Athlete {
  shortName: string;
}

interface Competitor {
  athlete: Athlete;
  team: {
    abbreviation: string;
    displayName: string;
    logo: string;
    links: { href: string }[];
  };
  score: string;
  records?: { summary: string }[];
  probables?: { athlete: { displayName: string; headshot: string } }[];
}

interface Status {
  type: {
    state: string;
    completed?: boolean;
    detail?: string;
  };
  period?: number;
  displayClock?: string;
}

interface Competition {
  competitors: Competitor[];
  type: { id: number; abbreviation: string };
  status: Status;
  venue: {
    fullName: string;
    indoor: boolean;
    address: {
      city: string;
      state: string;
      country: string;
    };
  };
  tickets: [
    {
      summary: string;
    },
  ];
  season: {
    year: string;
    slug: string;
  };
}

interface Game {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: Status;
  circuit: {
    address: {
      city: string;
      country: string;
    };
  };
  competitions: Competition[];
  links: { href: string }[];
  season: {
    year: string;
    slug: string;
  };
  displayName: string;
}

interface Response {
  events: Game[];
  day: { date: string };
  leagues: { logos: { href: string }[] }[];
}

// Setting and Saving Title Logic

let titleType: string;
let titleType2: string;

if (favoriteLeague !== "f1") {
  titleType = "Games";
  titleType2 = "Game";
} else {
  titleType = "Races";
  titleType2 = "Race";
}

export default function Command() {
  const [menuBarTitle, setMenuBarTitle] = useState(`Select a ${titleType2}`);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const savedIndex = await LocalStorage.getItem("selectedGameIndex");
      if (savedIndex !== null) {
        setSelectedGameIndex(Number(savedIndex));
      }
    })();
  }, []);

  const {
    isLoading: scheduleLoading,
    data: scheduleData,
    revalidate: scheduleRevalidate,
  } = useFetch<Response>(`https://site.api.espn.com/apis/site/v2/sports/${favoriteSport}/${favoriteLeague}/scoreboard`);

  const games = scheduleData?.events ?? [];

  useEffect(() => {
    if (selectedGameIndex !== null && games[selectedGameIndex]) {
      updateTitle(selectedGameIndex);
    }
  }, [games, selectedGameIndex]);

  const updateTitle = async (index: number) => {
    const game = games[index];
    if (!game) return;

    let title = `${game?.shortName} - ${new Date(game?.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    let period;
    let periodNumber = `${game?.status?.period}`;
    let timeDisplay = game?.status?.displayClock;

    if (favoriteSport === "hockey") {
      period = "P";
    }

    if (favoriteSport === "basketball") {
      period = "Q";
    }

    if (favoriteSport === "football") {
      period = "Q";
    }

    if (favoriteSport === "baseball") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    if (favoriteSport === "racing") {
      period = "L";
    }

    if (favoriteSport === "soccer") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    if (favoriteLeague !== "f1") {
      if (game?.status?.type?.state === "in") {
        title = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score}   ${period}${periodNumber} ${timeDisplay}`;
      } else {
        if (game.status.type.state === "in") {
          title = `${game.competitions[4].competitors[0].athlete.shortName}     L${game.competitions[4].status.period} ${game.status.displayClock}`;
        }
      }
    }

    if (favoriteLeague !== "f1") {
      if (game?.status?.type?.state === "post") {
        title = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score}   (Final)`;
      }
    } else {
      if (
        game?.competitions[4]?.type?.abbreviation === "Race" &&
        game?.competitions[4]?.status?.type?.completed === true
      ) {
        title = `${game?.competitions?.[4]?.competitors[0]?.athlete?.shortName}`;
      }
    }

    setMenuBarTitle(title);
    setSelectedGameIndex(index);
    await LocalStorage.setItem("selectedGameIndex", index);
  };

  // League and Game Information

  const gameItems = games.map((game, index) => {
    let title = `${game?.shortName} - ${new Date(game?.date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    let period;
    let periodNumber = `${game?.status?.period}`;
    let timeDisplay = game?.status?.displayClock;

    if (favoriteSport === "hockey") {
      period = "P";
    }

    if (favoriteSport === "basketball") {
      period = "Q";
    }

    if (favoriteSport === "football") {
      period = "Q";
    }

    if (favoriteSport === "baseball") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    if (favoriteSport === "racing") {
      period = "L";
    }

    if (favoriteSport === "soccer") {
      timeDisplay = game?.status?.type?.detail ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    if (favoriteLeague !== "f1") {
      if (game?.status?.type?.state === "in") {
        title = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score}   ${period}${periodNumber} ${timeDisplay}`;
      } else {
        if (game.status.type.state === "in") {
          title = `${game.competitions[4].competitors[0].athlete.shortName}     L${game.competitions[4].status.period} ${game.status.displayClock}`;
        }
      }
    }

    if (favoriteLeague !== "f1") {
      if (game?.status?.type?.state === "post") {
        title = `${game?.competitions?.[0]?.competitors?.[1]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[1]?.score} - ${game?.competitions?.[0]?.competitors?.[0]?.team?.abbreviation} ${game?.competitions?.[0]?.competitors?.[0]?.score}   (Final)`;
      }
    } else {
      if (
        game?.competitions[4]?.type?.abbreviation === "Race" &&
        game?.competitions[4]?.status?.type?.completed === true
      ) {
        title = `${game?.competitions?.[4]?.competitors[0]?.athlete?.shortName}`;
      }
    }

    return (
      <MenuBarExtra.Item
        key={index}
        title={title}
        icon={
          game?.competitions?.[0]?.competitors?.[1]?.team?.logo ??
          `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${favoriteLeague}.png&w=100&h=100&transparent=true`
        }
        tooltip={`Set ${titleType2} as Title`}
        onAction={() => updateTitle(index)}
      />
    );
  });

  // Date and Titles

  const currentDate = new Date().toLocaleDateString();
  const gamesDate = currentDate;

  // Clear Local Storage

  function clearSetTitle() {
    LocalStorage.removeItem("selectedGameIndex");
    scheduleRevalidate();
    setSelectedGameIndex(null);
    setMenuBarTitle(`Select a ${titleType2}`);
  }

  const extraItemSeparator = <MenuBarExtra.Separator />;

  const extraItem = (
    <MenuBarExtra.Item
      title={`Clear Set ${titleType2}`}
      icon={Icon.ArrowClockwise}
      tooltip="Reset Menu Bar Title"
      onAction={() => {
        clearSetTitle();
      }}
    />
  );

  const allGameItems = [...gameItems, extraItemSeparator, extraItem];

  // Return Logic

  return (
    <MenuBarExtra isLoading={scheduleLoading} icon={Icon.Livestream} title={menuBarTitle}>
      <MenuBarExtra.Submenu title={`${favoriteLeague.toUpperCase()} ${titleType}`} icon={Icon.GameController}>
        <MenuBarExtra.Section title={`${gamesDate}`}></MenuBarExtra.Section>
        {allGameItems}
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
