import { getPreferenceValues } from "@raycast/api";
import { SpeedDialGrid } from "./utils/speed-dial";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.FileSpeedDial>();

  return (
    <SpeedDialGrid
      items={[
        prefs.fileOne,
        prefs.fileTwo,
        prefs.fileThree,
        prefs.fileFour,
        prefs.fileFive,
        prefs.fileSix,
        prefs.fileSeven,
        prefs.fileEight,
      ]}
    />
  );
}
