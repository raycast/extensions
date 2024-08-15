import { getPreferenceValues } from "@raycast/api";
import Schedule from "./views/schedule";

const Command = () => {
  const { league } = getPreferenceValues<Preferences>();

  return <Schedule subtitle={league.toUpperCase()} />;
};

export default Command;
