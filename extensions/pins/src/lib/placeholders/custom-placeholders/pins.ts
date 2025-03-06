import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getStorage } from "../../storage";
import { StorageKey } from "../../constants";
import { Pin } from "../../Pins";
import { Clipboard } from "@raycast/api";

/**
 * Placeholder for the JSON representation of all pins.
 */
const PinsPlaceholder: Placeholder = {
  name: "pins",
  regex: /{{pins( amount=[0-9]+)?}}/,
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
      const res = JSON.stringify(pins).replaceAll("{{", "[[").replaceAll("}}", "]]").replaceAll("\\", "\\\\");
      await Clipboard.copy(res);
      return { result: res, pins: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["pins"],
  fn: async () => (await PinsPlaceholder.apply(`{{pins}}`)).result,
  example: "{{pins}}",
  description:
    "The JSON representation of all pins (or a random subset of them, if the `amount` parameter is specified).",
  hintRepresentation: "{{pins}}",
  fullRepresentation: "Pins JSON",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinsPlaceholder;
