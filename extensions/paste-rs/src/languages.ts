// Supported by https://paste.rs/web (verified 2026-10-12).
// Markdown renders as HTML; other non-empty values select syntax highlighting.
export const LANGUAGES = [
  {
    title: "Plain Text",
    value: "",
  },
  {
    title: "Bash",
    value: "bash",
  },
  {
    title: "C",
    value: "c",
  },
  {
    title: "C++",
    value: "cpp",
  },
  {
    title: "C#",
    value: "cs",
  },
  {
    title: "Clojure",
    value: "clj",
  },
  {
    title: "CSS",
    value: "css",
  },
  {
    title: "Diff",
    value: "diff",
  },
  {
    title: "Erlang",
    value: "erl",
  },
  {
    title: "Go",
    value: "go",
  },
  {
    title: "Haskell",
    value: "hs",
  },
  {
    title: "HTML",
    value: "html",
  },
  {
    title: "Java",
    value: "java",
  },
  {
    title: "JavaScript",
    value: "js",
  },
  {
    title: "JSON",
    value: "json",
  },
  {
    title: "Lua",
    value: "lua",
  },
  {
    title: "Markdown",
    value: "md",
  },
  {
    title: "OCaml",
    value: "ml",
  },
  {
    title: "Perl",
    value: "pl",
  },
  {
    title: "PHP",
    value: "php",
  },
  {
    title: "Python",
    value: "py",
  },
  {
    title: "R",
    value: "r",
  },
  {
    title: "Ruby",
    value: "rb",
  },
  {
    title: "Rust",
    value: "rs",
  },
  {
    title: "Scala",
    value: "scala",
  },
  {
    title: "Shell",
    value: "sh",
  },
  {
    title: "SQL",
    value: "sql",
  },
  {
    title: "XML",
    value: "xml",
  },
  {
    title: "YAML",
    value: "yaml",
  },
] as const;

export function getLanguageExtension(language: string): string {
  if (!LANGUAGES.some((item) => item.value === language)) {
    throw new Error("Unsupported paste language");
  }
  return language;
}
