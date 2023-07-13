import { BuiltInParserName } from "prettier";

export type Parser = BuiltInParserName;

export type Language =
  | "angular"
  | "css"
  | "glimmer"
  | "graphql"
  | "html"
  | "javascript"
  | "json"
  | "json5"
  | "less"
  | "lwc"
  | "markdown"
  | "mdx"
  | "scss"
  | "typescript"
  | "vue"
  | "yaml";

export type Preferences = {
  printWidth: string;
};
