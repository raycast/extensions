import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for a comma-separated list of animals detected in selected images in Finder.
 */
const ImageAnimalsPlaceholder: Placeholder = {
  name: "imageAnimals",
  regex: /{{imageAnimals}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageAnimals = context && "imageAnimals" in context ? (context["imageAnimals"] as string) : "";
    return { result: imageAnimals, imageAnimals: imageAnimals };
  },
  result_keys: ["imageAnimals"],
  constant: true,
  fn: async () => (await ImageAnimalsPlaceholder.apply("{{imageAnimals}}")).result,
  example: "Explain how these animals are similar: {{imageAnimals}}",
  description: "Replaced with a comma-separated list of animals detected in selected images in Finder.",
  hintRepresentation: "{{imageAnimals}}",
  fullRepresentation: "Animals in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageAnimalsPlaceholder;
