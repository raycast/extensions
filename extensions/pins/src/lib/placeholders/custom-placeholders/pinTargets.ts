import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, sortPins } from "../../Pins";
import { SORT_FN, StorageKey } from "../../constants";
import { getStorage } from "../../storage";

/**
 * Placeholder for the newline-separated list of pin targets. The list is sorted by most recently opened pin first.
 */
const PinTargetsPlaceholder: Placeholder = {
  name: "pinTargets",
  regex: /{{pinTargets( amount=[0-9]+)?}}/,
  rules: [],
  apply: async (str: string) => {
    let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
    try {
      const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
      if (numToSelect >= 0) {
        numToSelect = Math.min(numToSelect, pins.length);
        while (pins.length > numToSelect) {
          pins.splice(Math.floor(Math.random() * pins.length), 1);
        }
      }
      const pinTargets = sortPins(pins, [], undefined, SORT_FN.LAST_OPENED).map((pin) => pin.url);
      const res = pinTargets.join(", ").replaceAll("{{", "[[").replaceAll("}}", "]]").replaceAll("\\", "\\\\");
      return { result: res, pinTargets: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["pinTargets"],
  fn: async () => (await PinTargetsPlaceholder.apply(`{{pinTargets}}`)).result,
  example: "{{pinTargets}}",
  description: "The newline-separated list of pin targets. The list is sorted by most recently opened pin first.",
  hintRepresentation: "{{pinTargets}}",
  fullRepresentation: "Pin Targets",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinTargetsPlaceholder;
