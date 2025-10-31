import { Color, Image } from "@raycast/api";
import { LanguageStats } from "../types";
import { GitManager } from "./git-manager";

const MAIN_LANGUAGE_PERCENTAGE = 70;

const LANGUAGES_COLORS: Record<string, Image.ImageLike> = {
  JavaScript: "https://api.iconify.design/vscode-icons/file-type-js-official.svg",
  TypeScript: "https://api.iconify.design/vscode-icons/file-type-typescript-official.svg",
  Python: "https://api.iconify.design/vscode-icons/file-type-python.svg",
  Java: "https://api.iconify.design/skill-icons/java-light.svg",
  "C#": { source: "https://api.iconify.design/teenyicons/c-sharp-solid.svg", tintColor: Color.Purple },
  Ruby: { source: "https://api.iconify.design/openmoji/ruby.svg" },
  PHP: { source: "https://api.iconify.design/akar-icons/php-fill.svg", tintColor: Color.Blue },
  Go: "https://api.iconify.design/vscode-icons/file-type-go-gopher.svg",
  Rust: "https://api.iconify.design/material-icon-theme/rust.svg",
  Dart: "https://api.iconify.design/vscode-icons/file-type-dartlang.svg",
  Swift: "https://api.iconify.design/vscode-icons/file-type-swift.svg",
  Kotlin: "https://api.iconify.design/material-icon-theme/kotlin.svg",
  Zig: "https://api.iconify.design/material-icon-theme/zig.svg",
  Shell: "https://api.iconify.design/simple-icons/gnubash.svg",
  Groovy: "https://api.iconify.design/material-icon-theme/groovy.svg",
};

const LANGUAGE_EXTENSION: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  vue: "JavaScript",

  c: "C",
  cs: "C#",
  cpp: "C++",
  cxx: "C++",
  cc: "C++",
  hpp: "C++",
  hh: "C++",
  hxx: "C++",
  h: "Objective-C",
  m: "Objective-C",

  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  tcsh: "Shell",
  csh: "Shell",
  dash: "Shell",
  ash: "Shell",
  ksh: "Shell",

  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",

  py: "Python",
  rb: "Ruby",
  php: "PHP",
  go: "Go",
  rs: "Rust",
  dart: "Dart",
  zig: "Zig",
  groovy: "Groovy",
  swift: "Swift",
};

function getExtension(filePath: string): string | undefined {
  const lastSlash = filePath.lastIndexOf("/");
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return undefined;
  return fileName.slice(lastDot + 1).toLowerCase();
}

export async function detectRepositoryLanguages(repositoryPath: string): Promise<LanguageStats[]> {
  const gitManager = new GitManager(repositoryPath);
  const trackedFiles = await gitManager.getTrackedFilePaths();

  let totalFiles = trackedFiles.length;
  if (totalFiles === 0) return [];

  const languageFilesCounter: Record<string, number> = {};
  for (const relativePath of trackedFiles) {
    const extension = getExtension(relativePath);
    if (!extension) {
      totalFiles--;
      continue;
    }
    const language = LANGUAGE_EXTENSION[extension];
    if (!language) {
      totalFiles--;
      continue;
    }
    languageFilesCounter[language] = (languageFilesCounter[language] || 0) + 1;
  }

  if (Object.keys(languageFilesCounter).length === 0) return [];

  const sortedLanguages = Object.entries(languageFilesCounter)
    .map(([name, count]) => ({
      name,
      percentage: (count / totalFiles) * 100,
      color: LANGUAGES_COLORS[name as keyof typeof LANGUAGES_COLORS],
    }))
    .sort((a, b) => b.percentage - a.percentage);

  if (sortedLanguages[0] && sortedLanguages[0].percentage >= MAIN_LANGUAGE_PERCENTAGE) {
    return [sortedLanguages[0]];
  }

  const primaryLanguages: LanguageStats[] = [];
  let sum = 0;
  for (const lang of sortedLanguages) {
    primaryLanguages.push(lang);
    sum += lang.percentage;
    if (sum >= MAIN_LANGUAGE_PERCENTAGE) break;
  }
  return primaryLanguages;
}
