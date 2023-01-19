enum Language {
  All = "All",
  HTML = "HTML",
  CSS = "CSS",
  JavaScript = "JavaScript",
  TypeScript = "TypeScript",
  Ruby = "Ruby",
  PHP = "PHP",
  Java = "Java",
  Python = "Python",
  Go = "Go",
  C = "C",
  CPlusPlus = "C++",
  Swift = "Swift",
  Rust = "Rust",
  Elixir = "Elixir",
  Scala = "Scala",
  Kotlin = "Kotlin",
}

interface CodeStash {
  id: string;
  title: string;
  code: string;
  language: string;
}

export { Language };
export type { CodeStash };
