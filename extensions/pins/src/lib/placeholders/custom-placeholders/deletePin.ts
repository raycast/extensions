import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, deletePin } from "../../Pins";
import { StorageKey } from "../../constants";
import { getStorage } from "../../storage";

/**
 * Placeholder directive for deleting a pin.
 */
const DeletePinDirective: Placeholder = {
  name: "deletePin",
  regex: /{{deletePin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(/{{deletePin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)}}/);
    const pinRef = matches?.[1] || "";
    if (!pinRef) return { result: "" };

    const allPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
    const pin = allPins.find((p) => p.name == pinRef || p.id.toString() == pinRef);
    if (!pin) return { result: "" };

    await deletePin(pin, () => {}, true, true);
    return { result: "" };
  },
  constant: false,
  fn: async (pinRef) => (await DeletePinDirective.apply(`{{deletePin:${pinRef}}}`)).result,
  example: "{{deletePin:pinName}}",
  description: "Deletes a pin.",
  hintRepresentation: "{{deletePin:...}}",
  fullRepresentation: "Delete Pin",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Meta],
};

export default DeletePinDirective;
