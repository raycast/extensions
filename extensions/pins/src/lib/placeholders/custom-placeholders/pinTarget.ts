import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";
import { Pin } from "../../Pins";

/**
 * Placeholder for the target of the current pin.
 */
const PinTargetPlaceholder: Placeholder = {
  name: "pinTarget",
  regex: /{{pinTarget}}/,
  rules: [],
  apply: async (str, context?: { [key: string]: unknown }) => {
    if (!context || !context["pin"]) {
      return { result: "" };
    }
    return { result: (context["pin"] as Pin).url };
  },
  constant: false,
  fn: async (context?) =>
    (await PinTargetPlaceholder.apply(`{{pinTarget}}`, context as unknown as { [key: string]: unknown })).result,
  example: "{{pinTarget}}",
  description: "Gets the target of the current pin.",
  hintRepresentation: "{{pinTarget}}",
  fullRepresentation: "Pin Target",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Meta],
};

export default PinTargetPlaceholder;
