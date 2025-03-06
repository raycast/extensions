import { LeagueProvider } from "./contexts/leagueContext";
import { ShowDetailsProvider } from "./contexts/showDetailsContext";
import Standings from "./views/standings";

const Command = () => {
  return (
    <LeagueProvider>
      <ShowDetailsProvider>
        <Standings />
      </ShowDetailsProvider>
    </LeagueProvider>
  );
};

export default Command;
