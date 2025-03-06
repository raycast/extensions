import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getPreviousPin } from "../../Pins";
import { getStorage } from "../../storage";
import { StorageKey } from "../../constants";

/**
 * Placeholder for the name of the most recently opened pin before the current one. The substitution will be URL-encoded.
 */
const PreviousPinNamePlaceholder: Placeholder = {
  name: "previousPinName",
  regex: /{{(previousPinName|lastPinName)}}/,
  rules: [
    async () => {
      try {
        const previousPin = getStorage(StorageKey.LAST_OPENED_PIN);
        if (!previousPin) return false;
        return true;
      } catch (e) {
        return false;
      }
    },
  ],
  apply: async () => {
    try {
      const previousPinName = (await getPreviousPin())?.name || "";
      const res = encodeURI(previousPinName);
      return { result: res, previousPinName: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["previousPinName"],
  fn: async () => (await PreviousPinNamePlaceholder.apply(`{{previousPinName}}`)).result,
  example: "{{previousPinName}}",
  description: "The name of the most recently opened pin before the current one. The substitution will be URL-encoded.",
  hintRepresentation: "{{previousPinName}}",
  fullRepresentation: "Last Opened Pin Name",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PreviousPinNamePlaceholder;
