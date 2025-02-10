import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { getStorage } from "../../storage";
import { Group } from "../../Groups";
import { StorageKey } from "../../constants";

/**
 * Placeholder for the comma-separated list of group names. The list's order matches the order of groups in the 'View Pins' command.
 */
const GroupNamesPlaceholder: Placeholder = {
  name: "groupNames",
  regex: /{{groupNames( amount=[0-9]+)?}}/,
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
      const res = groups.map((group) => group.name).join(", ");
      return { result: res, groupNames: res };
    } catch (e) {
      return { result: "" };
    }
  },
  constant: true,
  result_keys: ["groupNames"],
  fn: async () => (await GroupNamesPlaceholder.apply(`{{groupNames}}`)).result,
  example: "{{groupNames}}",
  description:
    "The comma-separated list of group names. The list's order matches the order of groups in the 'View Pins' command.",
  hintRepresentation: "{{groupNames}}",
  fullRepresentation: "Group Names",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default GroupNamesPlaceholder;
