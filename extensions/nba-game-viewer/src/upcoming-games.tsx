import { LeagueProvider } from "./contexts/leagueContext";
import { ShowDetailsProvider } from "./contexts/showDetailsContext";
import Schedule from "./views/schedule";

const Command = () => {
  return (
    <LeagueProvider>
      <ShowDetailsProvider>
        <Schedule />
      </ShowDetailsProvider>
    </LeagueProvider>
  );
};

export default Command;
