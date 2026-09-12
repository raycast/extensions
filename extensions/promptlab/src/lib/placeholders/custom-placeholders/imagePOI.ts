import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for a comma-separated list of normalized points of interest (i.e. landmark locations as (x, y) coordinates in the (0,0) to (1, 1) space) detected in selected images in Finder.
 */
const ImagePOIPlaceholder: Placeholder = {
  name: "imagePOI",
  regex: /{{imagePOI}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imagePOI = context && "imagePOI" in context ? (context["imagePOI"] as string) : "";
    return { result: imagePOI, imagePOI: imagePOI };
  },
  result_keys: ["imagePOI"],
  constant: true,
  fn: async () => (await ImagePOIPlaceholder.apply("{{imagePOI}}")).result,
  example: "Where are the points of interest in this image? {{imagePOI}}",
  description:
    "Replaced with a comma-separated list of normalized points of interest detected in selected images in Finder.",
  hintRepresentation: "{{imagePOI}}",
  fullRepresentation: "Points of Interest in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImagePOIPlaceholder;
