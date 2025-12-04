import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { LocationManager } from "../../scripts";

/**
 * Placeholder for the name of the user's current longitude.
 */
const LongitudePlaceholder: Placeholder = {
  name: "longitude",
  regex: /{{(longitude|long)}}/,
  rules: [],
  apply: async () => {
    const longitude = (await LocationManager.getLongitude()).toString();
    return { result: longitude, longitude };
  },
  constant: true,
  result_keys: ["longitude"],
  fn: async () => (await LongitudePlaceholder.apply(`{{longitude}}`)).result,
  example: "{{longitude}}",
  description: "The user's current longitude.",
  hintRepresentation: "{{longitude}}",
  fullRepresentation: "Longitude",
  type: PlaceholderType.StaticDirective,
  categories: [PlaceholderCategory.Location],
};

export default LongitudePlaceholder;
