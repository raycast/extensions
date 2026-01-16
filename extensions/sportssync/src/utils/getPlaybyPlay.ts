import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

interface GameHeader {
  links: { href: string }[];
  competitions: {
    competitors: { team: { links: { href: string }[] } }[];
  }[];
}
export interface Play {
  type: {
    text: string;
  };
  period: {
    number: string;
    type: string;
  };
  clock: {
    displayValue: string;
  };
  team: {
    id: string;
  };
  participants?: {
    athlete: {
      id: string;
    };
    type: string;
  }[];
  text: string;
}

type BaseballSituation = {
  balls: number;
  strikes: number;
  outs: number;
  onFirst?: {
    playerId: number;
  };
  onSecond?: {
    playerId: number;
  };
  onThird?: {
    playerId: number;
  };
};

type BoxScoreTeam = {
  team: {
    id: string;
    displayName: string;
    logo: string;
  };
  homeAway: string;
  statistics?: {
    name: string;
    stats?: {
      name: string;
      displayValue: string;
    }[];
    displayValue?: string;
  }[];
};

export interface PlayByPlayData {
  situation?: BaseballSituation;
  header: GameHeader;
  leaders?: {
    team: {
      id: string;
      abbreviation: string;
    };
    leaders: {
      name: string;
      leaders: {
        displayValue: string;
        athlete: {
          id: string;
          shortName: string;
          headshot: {
            href: string;
          };
        };
      }[];
    }[];
  }[];
  boxscore: {
    teams: BoxScoreTeam[];
    players: {
      statistics: {
        athletes: {
          athlete: {
            id: string;
            shortName: string;
            headshot: {
              href: string;
            };
          };
          active: boolean;
          stats: string[];
        }[];
      }[];
    }[];
  };
  plays: Play[];
}

export default function getPlayByPlayEvents({ gameId }: { gameId: string }) {
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  const {
    isLoading: playByPlayLoading,
    data: playByPlayEventData,
    revalidate: playByPlayRevalidate,
  } = useFetch<PlayByPlayData>(
    `https://site.web.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/summary?event=${gameId}`,
  );

  return { playByPlayEventData, playByPlayLoading, playByPlayRevalidate };
}
