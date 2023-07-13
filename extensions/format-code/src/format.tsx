import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";

import { pipeline } from "./pipeline";
import { Language, Parser } from "./types";

const supportedLanguages: Record<Language, Parser> = {
  angular: "angular",
  css: "css",
  glimmer: "glimmer",
  graphql: "graphql",
  html: "html",
  javascript: "babel",
  json: "json",
  json5: "json5",
  less: "less",
  lwc: "lwc",
  markdown: "markdown",
  mdx: "mdx",
  scss: "scss",
  typescript: "typescript",
  vue: "vue",
  yaml: "yaml",
};

type CommandProps = {
  language: Language;
  parser: Parser;
};

function Format({ language, parser }: CommandProps) {
  const abortable = useRef<AbortController>();

  const { isLoading, data: markdown } = usePromise(pipeline, [language, parser], { abortable });

  return <Detail isLoading={isLoading} markdown={markdown} />;
}

const formatterEntries = Object.entries(supportedLanguages).map(([language, parser]) => {
  return [language, () => <Format language={language as Language} parser={parser} />];
});

const formatters = Object.fromEntries(formatterEntries) as Record<Language, JSX.Element>;

export default formatters;
