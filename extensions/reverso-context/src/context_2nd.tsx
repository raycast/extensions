import { getPreferenceValues } from "@raycast/api";
import CommandBase from "./contextBase";
import { AllPreferences } from "./domain";

export default function Command_2nd() {
  return CommandBase(() => {
    const allPrefs = getPreferenceValues<AllPreferences>();

    return {
      langFrom: allPrefs.langFrom_2nd,
      langTo: allPrefs.langTo_2nd,
      correctLangPairDirection: allPrefs.correctLangPairDirection_2nd,
    };
  });
}
