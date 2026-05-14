import { getPreferenceValues } from "@raycast/api";
import { SpeedDialGrid } from "./utils/speed-dial";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.FolderSpeedDial>();

  return (
    <SpeedDialGrid
      items={[
        prefs.dirOne,
        prefs.dirTwo,
        prefs.dirThree,
        prefs.dirFour,
        prefs.dirFive,
        prefs.dirSix,
        prefs.dirSeven,
        prefs.dirEight,
      ]}
    />
  );
}
