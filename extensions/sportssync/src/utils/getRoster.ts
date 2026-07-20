import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

interface Player {
  displayName: string;
  displayWeight: string;
  displayHeight: string;
  age: number;
  headshot?: {
    href: string;
  };
  jersey: string;
  injuries?: {
    status: string;
  }[];
  links: {
    href: string;
  }[];
}

interface Coach {
  firstName: string;
  lastName: string;
  experience?: string;
}

interface Athlete {
  items: Player[];
  position: string;
}

interface Response {
  coach?: Coach[];
  athletes: Athlete[];
}

export default function getTeamRoster({ teamId }: { teamId: string }) {
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  const {
    isLoading: rosterLoading,
    data: rosterData,
    revalidate: rosterRevalidate,
  } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/teams/${teamId}/roster`,
  );

  return { rosterData, rosterLoading, rosterRevalidate };
}
