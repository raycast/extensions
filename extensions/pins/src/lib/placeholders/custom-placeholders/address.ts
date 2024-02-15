import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { LocationManager } from "../../scripts";

/**
 * Placeholder for the name of the user's current street address.
 */
const StreetAddressPlaceholder: Placeholder = {
  name: "address",
  regex: /{{(address|streetAddress)}}/,
  rules: [],
  apply: async () => {
    const address = await LocationManager.getStreetAddress();
    return { result: address, address };
  },
  constant: true,
  result_keys: ["address"],
  fn: async () => (await StreetAddressPlaceholder.apply(`{{address}}`)).result,
  example: "{{address}}",
  description: "The user's current street address.",
  hintRepresentation: "{{address}}",
  fullRepresentation: "Street Address",
  type: PlaceholderType.StaticDirective,
  categories: [PlaceholderCategory.Location],
};

export default StreetAddressPlaceholder;
