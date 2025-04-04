import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

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

interface Team {
  logos: { href: string }[];
  links: { href: string }[];
  displayName: string;
}

interface NHLTransaction {
  date: string;
  description: string;
  team: Team;
}

interface Response {
  transactions: NHLTransaction[];
}

export default function getTransactions() {
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  const {
    isLoading: transactionLoading,
    data: transactionData,
    revalidate: transactionRevalidate,
  } = useFetch<Response>(
    `https://site.api.espn.com/apis/site/v2/sports/${currentSport}/${currentLeague}/transactions?limit=75`,
  );

  return { transactionData, transactionLoading, transactionRevalidate };
}
