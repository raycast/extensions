// src/projects/constants.ts
import { existsSync } from "fs";

export function isValidIde(idePath: string | undefined): boolean {
  return !!idePath && existsSync(idePath);
}

export const LANGUAGE_OPTIONS = [
  { name: "TypeScript", value: "typescript", alias: "ts" },
  { name: "JavaScript", value: "javascript", alias: "js" },
  { name: "Python", value: "python", alias: "py" },
  { name: "Rust", value: "rust", alias: "rs" },
  { name: "Go", value: "go", alias: "golang" },
  { name: "Ruby", value: "ruby", alias: "rb" },
  { name: "Java", value: "java" },
  { name: "Kotlin", value: "kotlin", alias: "kt" },
  { name: "Swift", value: "swift" },
  { name: "Dart", value: "dart", alias: "flutter" },
  { name: "PHP", value: "php" },
  { name: "C#", value: "csharp", alias: "cs" },
  { name: "C++", value: "cpp", alias: "c++" },
  { name: "Elixir", value: "elixir", alias: "ex" },
  { name: "Scala", value: "scala", alias: "sc" },
] as const;

export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];
