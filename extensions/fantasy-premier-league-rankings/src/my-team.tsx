import { RequireTeamId } from "./components/MissingTeamId";
import { TeamView } from "./components/TeamView";

export default function Command() {
  return <RequireTeamId>{(teamId) => <TeamView entryId={teamId} />}</RequireTeamId>;
}
