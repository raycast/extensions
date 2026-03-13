import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getStorage } from "../../storage";
import { Pin } from "../../Pins";
import { StorageKey } from "../../constants";

/**
 * Placeholder for the comma-separated list of pin names. The list is sorted by most recently opened pin first.
 */
const PinNamesPlaceholder: Placeholder = {
  name: "pinNames",
  regex: /{{pinNames( amount=[0-9]+)?}}/,
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
      const pinNames = pins
        .sort((a, b) => new Date(b.lastOpened || 0).getTime() - new Date(a.lastOpened || 0).getTime())
        .map((pin) => pin.name);
      const res = pinNames.join(", ");
      return { result: res, pinNames: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["pinNames"],
  fn: async () => (await PinNamesPlaceholder.apply(`{{pinNames}}`)).result,
  example: "{{pinNames}}",
  description: "The comma-separated list of pin names. The list is sorted by most recently opened pin first.",
  hintRepresentation: "{{pinNames}}",
  fullRepresentation: "Pin Names",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinNamesPlaceholder;
