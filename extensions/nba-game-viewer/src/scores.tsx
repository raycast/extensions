import { LeagueProvider } from "./contexts/leagueContext";
import { ShowDetailsProvider } from "./contexts/showDetailsContext";
import Scores from "./views/scores";

const Command = () => {
  return (
    <LeagueProvider>
      <ShowDetailsProvider>
        <Scores />
      </ShowDetailsProvider>
    </LeagueProvider>
  );
};

export default Command;
