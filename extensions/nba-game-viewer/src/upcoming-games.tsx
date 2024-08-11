import { getPreferenceValues } from "@raycast/api";
import Schedule from "./views/schedule";

const Command = () => {
  const preferences = getPreferenceValues<{ league: string }>();
  const selectedLeague = preferences.league || "NBA";

  return <Schedule subtitle={selectedLeague} />;
};

export default Command;
