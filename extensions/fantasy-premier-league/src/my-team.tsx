import { MissingTeamId } from "./components/MissingTeamId";
import { TeamView } from "./components/TeamView";
import { getTeamId } from "./hooks";

export default function Command() {
  const teamId = getTeamId();
  if (!teamId) return <MissingTeamId />;
  return <TeamView entryId={teamId} />;
}
