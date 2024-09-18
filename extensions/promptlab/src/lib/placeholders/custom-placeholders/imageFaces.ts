import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the number of faces detected in selected images in Finder.
 */
const ImageFacesPlaceholder: Placeholder = {
  name: "imageFaces",
  regex: /{{imageFaces}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageFaces = context && "imageFaces" in context ? (context["imageFaces"] as string) : "";
    return { result: imageFaces, imageFaces: imageFaces };
  },
  result_keys: ["imageFaces"],
  constant: true,
  fn: async () => (await ImageFacesPlaceholder.apply("{{imageFaces}}")).result,
  example: "Is {{imageFaces}} a lot of faces?",
  description: "Replaced with the number of faces detected in selected images in Finder.",
  hintRepresentation: "{{imageFaces}}",
  fullRepresentation: "Number of Faces in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageFacesPlaceholder;
