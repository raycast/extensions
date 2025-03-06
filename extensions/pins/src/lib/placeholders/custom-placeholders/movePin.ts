import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin, movePin } from "../../Pins";
import { Group, createNewGroup } from "../../Groups";
import { StorageKey, Visibility } from "../../constants";
import { getStorage } from "../../storage";

/**
 * Placeholder directive for moving a pin to a different group.
 */
const MovePinDirective: Placeholder = {
  name: "movePin",
  regex: /{{movePin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))}}/,
  rules: [],
  apply: async (str) => {
    const matches = str.match(/{{movePin:(([^{]|{(?!{)|{{[\s\S]*?}})*?)(:(([^{]|{(?!{)|{{[\s\S]*?}})*?))}}/);
    const pinRef = matches?.[1] || "";
    if (!pinRef) return { result: "" };

    const allPins: Pin[] = await getStorage(StorageKey.LOCAL_PINS);
    const pin = allPins.find((p) => p.name == pinRef || p.id.toString() == pinRef);
    if (!pin) return { result: "" };

    const group = matches?.[4];
    if (!group) return { result: "" };

    const allGroups: Group[] = await getStorage(StorageKey.LOCAL_GROUPS);
    if (group != "None" && !allGroups.some((g) => g.name == group)) {
      if (group === "Expired Pins") {
        await createNewGroup({ name: group, icon: "BellDisabled", visibility: Visibility.HIDDEN });
      } else {
        await createNewGroup({ name: group, icon: "None" });
      }
    }

    await movePin(pin, group);
    return { result: "" };
  },
  constant: false,
  fn: async (name, group) => (await MovePinDirective.apply(`{{movePin:${name}:${group}}}`)).result,
  example: "{{movePin:pinName:groupName}}",
  description: "Moves a pin to the target group.",
  hintRepresentation: "{{movePin:...:...}}",
  fullRepresentation: "Move Pin",
  type: PlaceholderType.InteractiveDirective,
  categories: [PlaceholderCategory.Meta],
};

export default MovePinDirective;
