import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * Placeholder for the contents of the currently selected files in Finder.
 */
const FileContentsPlaceholder: Placeholder = {
  name: "contents",
  regex:
    /{{(selectedFileContents|selectedFilesContents|selectedFileContent|selectedFilesContent|selectedFileText|selectedFilesText|contents)}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const contents = context && "contents" in context ? (context["contents"] as string) : "";
    return { result: contents, contents: contents };
  },
  result_keys: ["contents"],
  constant: true,
  fn: async () => (await FileContentsPlaceholder.apply("{{contents}}")).result,
  example: "Identify the common theme among these files: {{contents}}",
  description:
    "Replaced with the extracted contents of the currently selected files in Finder. Clarifying text is added to identify each type of information.",
  hintRepresentation: "{{contents}}",
  fullRepresentation: "Selected File Contents",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default FileContentsPlaceholder;
