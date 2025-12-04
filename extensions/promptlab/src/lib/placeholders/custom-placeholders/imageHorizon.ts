import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the angle of the horizon detected in selected images in Finder.
 */
const ImageHorizonPlaceholder: Placeholder = {
  name: "imageHorizon",
  regex: /{{imageHorizon}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageHorizon = context && "imageHorizon" in context ? (context["imageHorizon"] as string) : "";
    return { result: imageHorizon, imageFaces: imageHorizon };
  },
  result_keys: ["imageHorizon"],
  constant: true,
  fn: async () => (await ImageHorizonPlaceholder.apply("{{imageHorizon}}")).result,
  example: "With a horizon angle of {{imageHorizon}}, is this image likely taken from a drone?",
  description: "Replaced with the angle of the horizon detected in selected images in Finder.",
  hintRepresentation: "{{imageHorizon}}",
  fullRepresentation: "Horizon Angle of Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageHorizonPlaceholder;
