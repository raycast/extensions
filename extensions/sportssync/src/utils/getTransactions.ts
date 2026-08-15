import { useFetch } from "@raycast/utils";
import sportInfo from "./getSportInfo";

interface Team {
  logos: { href: string }[];
  links: { href: string }[];
  displayName: string;
  id: string;
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
