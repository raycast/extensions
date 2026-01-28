import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for a comma-separated list of rectangles detected in selected images in Finder.
 */
const ImageRectanglesPlaceholder: Placeholder = {
  name: "imageRectangles",
  regex: /{{imageRectangles}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageRectangles = context && "imageRectangles" in context ? (context["imageRectangles"] as string) : "";
    return { result: imageRectangles, imageRectangles: imageRectangles };
  },
  result_keys: ["imageRectangles"],
  constant: true,
  fn: async () => (await ImageRectanglesPlaceholder.apply("{{imageRectangles}}")).result,
  example: "Where is the largest rectangle in this image? {{imageRectangles}}",
  description:
    "Replaced with a comma-separated list of rectangles detected in selected images in Finder. The rectangles are defined in the format <Rectangle #1: midPoint=(centerX, centerY) dimensions=WidthxHeight>.",
  hintRepresentation: "{{imageRectangles}}",
  fullRepresentation: "Rectangles in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageRectanglesPlaceholder;
