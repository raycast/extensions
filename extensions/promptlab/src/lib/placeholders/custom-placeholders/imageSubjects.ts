import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for a comma-separated list of objects detected in selected images in Finder.
 */
const ImageSubjectsPlaceholder: Placeholder = {
  name: "imageSubjects",
  regex: /{{imageSubjects}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const imageSubjects = context && "imageSubjects" in context ? (context["imageSubjects"] as string) : "";
    return { result: imageSubjects, imageSubjects: imageSubjects };
  },
  result_keys: ["imageSubjects"],
  constant: true,
  fn: async () => (await ImageSubjectsPlaceholder.apply("{{imageSubjects}}")).result,
  example: "What is the common theme among these objects? {{imageSubjects}}",
  description: "Replaced with a comma-separated list of objects detected in selected images in Finder.",
  hintRepresentation: "{{imageSubjects}}",
  fullRepresentation: "Subjects/Objects in Selected Images",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default ImageSubjectsPlaceholder;
