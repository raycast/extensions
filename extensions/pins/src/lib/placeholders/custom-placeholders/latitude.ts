import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { LocationManager } from "../../scripts";

/**
 * Placeholder for the name of the user's current latitude.
 */
const LatitudePlaceholder: Placeholder = {
  name: "latitude",
  regex: /{{(latitude|lat)}}/,
  rules: [],
  apply: async () => {
    const latitude = (await LocationManager.getLatitude()).toString();
    return { result: latitude, latitude };
  },
  constant: true,
  result_keys: ["latitude"],
  fn: async () => (await LatitudePlaceholder.apply(`{{latitude}}`)).result,
  example: "{{latitude}}",
  description: "The user's current latitude.",
  hintRepresentation: "{{latitude}}",
  fullRepresentation: "Latitude",
  type: PlaceholderType.StaticDirective,
  categories: [PlaceholderCategory.Location],
};

export default LatitudePlaceholder;
