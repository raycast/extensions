import { getPreferenceValues } from "@raycast/api";
import CommandBase from "./contextBase";
import { AllPreferences } from "./domain";

export default function Command() {
  return CommandBase(() => {
    const allPrefs = getPreferenceValues<AllPreferences>();

    return {
      langFrom: allPrefs.langFrom,
      langTo: allPrefs.langTo,
      correctLangPairDirection: allPrefs.correctLangPairDirection,
    };
  });
}
