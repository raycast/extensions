import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for all text extracted from selected images in Finder.
 */
const ImageTextPlaceholder: Placeholder = {
  name: "imageText",
  regex: /{{imageText}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageText = context && "imageText" in context ? (context["imageText"] as string) : "";
    return { result: imageText, imageText: imageText };
  },
  result_keys: ["imageText"],
  constant: true,
  fn: async () => (await ImageTextPlaceholder.apply("{{imageText}}")).result,
  example:
    "Based on the following text extracted from an image, tell me what the image is about. Here's the text: ###{{imageText}}###",
  description:
    "Replaced with all text extracted from selected images in Finder. If no images are selected, or if no text can be extracted from the selected images, this will be replaced with an empty string.",
  hintRepresentation: "{{imageText}}",
  fullRepresentation: "Text in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageTextPlaceholder;
