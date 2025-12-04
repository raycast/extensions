import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, getPinStatistics, sortPins } from "../../Pins";
import { SORT_STRATEGY, StorageKey } from "../../constants";
import { getStorage } from "../../storage";
import { Group } from "../../Groups";

/**
 * Placeholder for the JSON representation of all pins.
 */
const PinStatisticsPlaceholder: Placeholder = {
  name: "pinStatistics",
  regex:
    /{{(statistics|stats|pinStats|pinStatistics)( sort="(alpha|alphabetical|freq|frequency|recency|dateCreated)")?( amount=[0-9]+)?}}/,
  rules: [],
  apply: async (str: string) => {
    let sortMethod = str.match(/(?<=sort=("|')).*?(?=("|'))/)?.[0] || "freq";
    if (sortMethod == "alpha") sortMethod = "alphabetical";
    if (sortMethod == "freq") sortMethod = "frequency";

    let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");

    try {
      const pins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];
      const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];

      if (numToSelect >= 0) {
        numToSelect = Math.min(numToSelect, pins.length);
        while (pins.length > numToSelect) {
          pins.splice(Math.floor(Math.random() * pins.length), 1);
        }
      }

      const stats = sortPins(pins, groups, sortMethod as keyof typeof SORT_STRATEGY).map(
        (pin) => `${pin.name}:\n\t${(getPinStatistics(pin, pins) as string).replaceAll("\n\n", "\n\t")}`,
      );
      const res = stats.join("\n\n");
      return { result: res, statistics: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["statistics"],
  fn: async () => (await PinStatisticsPlaceholder.apply(`{{statistics}}`)).result,
  example: "{{statistics}}",
  description:
    "The JSON representation of all pins (or a random subset of them, if the `amount` parameter is specified).",
  hintRepresentation: "{{statistics}}",
  fullRepresentation: "Pin Statistics",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinStatisticsPlaceholder;
