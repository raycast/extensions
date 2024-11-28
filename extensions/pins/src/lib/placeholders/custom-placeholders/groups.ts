import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getStorage } from "../../storage";
import { StorageKey } from "../../constants";
import { Group } from "../../Groups";

/**
 * Placeholder for the JSON representation of all groups.
 */
const GroupsPlaceholder: Placeholder = {
  name: "groups",
  regex: /{{groups( amount=[0-9]+)?}}/,
  rules: [],
  apply: async (str: string) => {
    let numToSelect = parseInt(str.match(/(?<=amount=)[0-9]+/)?.[0] || "-1");
    try {
      const groups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];
      if (numToSelect >= 0) {
        numToSelect = Math.min(numToSelect, groups.length);
        while (groups.length > numToSelect) {
          groups.splice(Math.floor(Math.random() * groups.length), 1);
        }
      }
      const res = JSON.stringify(groups).replaceAll("{{", "[[").replaceAll("}}", "]]");
      return { result: res, groups: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["groups"],
  fn: async () => (await GroupsPlaceholder.apply(`{{groups}}`)).result,
  example: "{{groups}}",
  description:
    "The JSON representation of all groups (or a random subset of them, if the `amount` parameter is specified).",
  hintRepresentation: "{{groups}}",
  fullRepresentation: "Groups JSON",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default GroupsPlaceholder;
