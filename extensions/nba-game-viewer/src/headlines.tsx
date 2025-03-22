import { LeagueProvider } from "./contexts/leagueContext";
import { ShowDetailsProvider } from "./contexts/showDetailsContext";
import Articles from "./views/articles";

const Command = () => {
  return (
    <LeagueProvider>
      <ShowDetailsProvider>
        <Articles />
      </ShowDetailsProvider>
    </LeagueProvider>
  );
};

export default Command;
