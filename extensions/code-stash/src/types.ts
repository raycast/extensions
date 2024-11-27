enum Language {
  All = "All",
  C = "C",
  CPlusPlus = "C++",
  CSharp = "C#",
  CSS = "CSS",
  Elixir = "Elixir",
  ENV = "ENV",
  Go = "Go",
  HTML = "HTML",
  Java = "Java",
  JavaScript = "JavaScript",
  JSON = "JSON",
  Kotlin = "Kotlin",
  PHP = "PHP",
  Properties = "Properties",
  Python = "Python",
  Ruby = "Ruby",
  Rust = "Rust",
  Scala = "Scala",
  SQL = "SQL",
  Swift = "Swift",
  TypeScript = "TypeScript",
}

interface CodeStash {
  id: string;
  title: string;
  code: string;
  language: string;
}

export { Language };
export type { CodeStash };
