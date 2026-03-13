import { ClassificationSpecificEnum } from "@pieces.app/pieces-os-client";

/**
 * Converts a classification specific enum value to a readable string.
 *
 * @param {ClassificationSpecificEnum} classification - The classification specific enum value.
 * @returns {string | undefined} The readable string corresponding to the classification, or undefined if not found.
 */
export default function classificationSpecificToReadable(
  classification: ClassificationSpecificEnum,
): string | undefined {
  return classificationSpecificToReadableMap[classification.toLowerCase()];
}

const classificationSpecificToReadableMap: { [key: string]: string } = {
  asp: "Asp",
  bat: "Batch",
  c: "C",
  cs: "C#",
  cpp: "C++",
  css: "CSS",
  clj: "Clojure",
  coffee: "Coffee",
  cfm: "ColdFusion",
  dart: "Dart",
  erl: "Erlang",
  ex: "Elixir",
  el: "Lisp",
  go: "Go",
  groovy: "Groovy",
  hs: "Haskell",
  html: "HTML",
  java: "Java",
  js: "JavaScript",
  json: "JSON",
  kt: "Kotlin",
  lua: "Lua",
  md: "Markdown",
  matlab: "MATLAB",
  m: "Objective-C",
  pl: "Perl",
  php: "PHP",
  text: "PlainTextGrammar",
  ps1: "PowerShell",
  py: "Python",
  rb: "Ruby",
  r: "R",
  rs: "Rust",
  scala: "Scala",
  sh: "Shell",
  sol: "Solidity",
  sql: "SQL",
  swift: "Swift",
  sv: "SystemVerilog",
  tex: "TeX",
  toml: "TOML",
  ts: "TypeScript",
  txt: "PlainTextGrammar",
  xml: "XML",
  yaml: "YAML",
  png: "PNG",
};
