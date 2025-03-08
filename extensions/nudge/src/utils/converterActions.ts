import { NudgeConverter } from "./nudgeConverter";

export type ActionMetadata = {
  action: (input: string) => string;
  title: string;
  // Short description to be used when showing the result
  type: string;
};

export const actions: Array<ActionMetadata> = [
  // JSON transformations
  {
    action: NudgeConverter.jsonToJsObject,
    type: "JSON to JS Object",
    title: "Convert JSON to JS Object",
  },
  {
    action: NudgeConverter.jsObjectToJson,
    type: "JS to JSON Object",
    title: "Convert JS Object to JSON",
  },
  {
    action: NudgeConverter.formatJson,
    type: "Format JSON",
    title: "Format JSON (Pretty Print)",
  },
  {
    action: NudgeConverter.minifyJson,
    type: "Minify JSON",
    title: "Minify JSON",
  },
  {
    action: NudgeConverter.sortJsonKeys,
    type: "Sort JSON Keys",
    title: "Sort JSON Keys",
  },

  // Unicode transformations
  {
    action: NudgeConverter.fromUnicode,
    type: "From Unicode",
    title: "Decode Unicode",
  },
  {
    action: NudgeConverter.toUnicode,
    type: "To Unicode",
    title: "Encode to Unicode",
  },

  // Whitespace management
  {
    action: NudgeConverter.trim,
    type: "Trim Whitespaces",
    title: "Trim",
  },

  // URL transformations
  {
    action: NudgeConverter.encodeUrl.bind(NudgeConverter),
    type: "Encode URL",
    title: "Encode URL",
  },
  {
    action: NudgeConverter.decodeUrl.bind(NudgeConverter),
    type: "Decode URL",
    title: "Decode URL",
  },

  // Base64 transformations
  {
    action: NudgeConverter.encodeBase64,
    type: "Base64 Encode",
    title: "Encode to Base64",
  },
  {
    action: NudgeConverter.decodeBase64,
    type: "Base64 Decode",
    title: "Decode from Base64",
  },

  // HTML Entity transformations
  {
    action: NudgeConverter.encodeHtmlEntities,
    type: "HTML Encode",
    title: "Encode HTML Entities",
  },
  {
    action: NudgeConverter.decodeHtmlEntities,
    type: "HTML Decode",
    title: "Decode HTML Entities",
  },

  // Case transformations
  {
    action: NudgeConverter.toCamelCase,
    type: "To camelCase",
    title: "Convert to camelCase",
  },
  {
    action: NudgeConverter.toSnakeCase,
    type: "To snake_case",
    title: "Convert to snake_case",
  },
  {
    action: NudgeConverter.toKebabCase,
    type: "To kebab-case",
    title: "Convert to kebab-case",
  },
  {
    action: NudgeConverter.toPascalCase,
    type: "To PascalCase",
    title: "Convert to PascalCase",
  },
];
