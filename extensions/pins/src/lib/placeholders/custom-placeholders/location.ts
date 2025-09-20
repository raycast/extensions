import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { LocationManager } from "../../scripts";

/**
 * Placeholder for a summary of the user's current location.
 */
const LocationPlaceholder: Placeholder = {
  name: "location",
  regex: /{{location}}/,
  rules: [],
  apply: async () => {
    const location = await LocationManager.getLocation();
    const address = `${location.streetNumber} ${location.street}, ${location.city}, ${location.state} ${location.postalCode}`;
    const res = `Address: ${address}, ${location.country}${
      address.includes(location.name.toString()) ? `` : `\nName: ${location.name}`
    }\nLatitude: ${location.latitude}\nLongitude: ${location.longitude}`;
    return { result: res, location: res };
  },
  constant: true,
  result_keys: ["location"],
  fn: async () => (await LocationPlaceholder.apply(`{{location}}`)).result,
  example: "{{location}}",
  description: "A summary of the user's current location.",
  hintRepresentation: "{{location}}",
  fullRepresentation: "Location",
  type: PlaceholderType.StaticDirective,
  categories: [PlaceholderCategory.Location],
};

export default LocationPlaceholder;
