import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, openPin } from "../../Pins";
import { getStorage } from "../../storage";
import { StorageKey } from "../../constants";
import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "../../preferences";

/**
 * Placeholder directive for opening/launching a target pin.
 */
const LaunchPinDirective: Placeholder = {
  name: "launchPin",
  regex: /{{(launchPin|openPin|runPin):(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(/{{(launchPin|openPin|runPin):(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/);
    const targetRep = matches?.[2] || "";
    if (!targetRep) return { result: "" };
    const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
    const target = pins.find((p) => p.name == targetRep || p.id.toString() == targetRep);
    if (!target) return { result: "" };
    const preferences = getPreferenceValues<ExtensionPreferences>();
    openPin(target, preferences);
    return { result: "" };
  },
  constant: false,
  fn: async (target: string) => (await LaunchPinDirective.apply(`{{launchPin:${target}}}`)).result,
  example: "{{launchPin:myPinName}}",
  description: "Opens the target pin.",
  hintRepresentation: "{{launchPin:...}}",
  fullRepresentation: "Launch Pin",
  type: PlaceholderType.StaticDirective,
  categories: [PlaceholderCategory.Meta],
};

export default LaunchPinDirective;
