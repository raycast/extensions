import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

interface Team {
  displayName: string;
  id: string;
  logos: { href: string }[];
  links: { href: string }[];
}

interface Athlete {
  displayName: string;
  position: { displayName: string };
  team: Team;
  links: { href: string }[];
}

interface InjuryDetails {
  id: string;
  type: string;
  severity: string;
  status: string;
  athlete: Athlete;
  details?: { returnDate: string };
}

interface Injury {
  injuries: InjuryDetails[];
}

interface Response {
  season: { displayName: string };
  injuries: Injury[];
}

export default function getInjuries() {
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  const {
    isLoading: injuryLoading,
    data: injuryData,
    revalidate: injuryRevalidate,
  } = useFetch<Response>(`https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/injuries`);

  return { injuryData, injuryLoading, injuryRevalidate };
}
