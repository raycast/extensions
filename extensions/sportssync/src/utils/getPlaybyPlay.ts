import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

interface GameHeader {
  links: { href: string }[];
  competitions: {
    competitors: { team: { links: { href: string }[] } }[];
  }[];
}

interface PlayByPlayData {
  header: GameHeader;
  boxscore: {
    teams: {
      team: { id: string; logo: string; displayName: string };
    }[];
  };
  plays: Array<{
    type: { text: string };
    period: { number: string; type: string };
    clock: { displayValue: string };
    team: { id: string };
    text: string;
  }>;
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
