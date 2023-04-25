import { readdir, stat } from "fs/promises";
import { basename } from "path";

export type Language = {
  language: string;
  color: string;
};

const JAVA: Language = {
  language: "Java",
  color: "#d33529",
};
const GO: Language = {
  language: "Go",
  color: "#29c2d3",
};
const JAVASCRIPT: Language = {
  language: "Javascript",
  color: "#dada31",
};
const TYPESCRIPT: Language = {
  language: "Typescript",
  color: "#1d65a8",
};
const KOTLIN: Language = {
  language: "Kotlin",
  color: "#8e26de",
};
const PYTHON: Language = {
  language: "Python",
  color: "#31da42",
};
const DOCKER: Language = {
  language: "Docker",
  color: "#415acc",
};
const BASH: Language = {
  language: "Bash",
  color: "#3e4450",
};
export const OTHER: Language = {
  language: "Other",
  color: "#9ba2c4",
};

export const obtainLanguages = (files: string[]): Language[] => {
  const configFiles: { [key: string]: Language } = {
    "^go.mod$": GO,
    ".*\\.go$": GO,
    "^package.json$": JAVASCRIPT,
    ".*\\.js$": JAVASCRIPT,
    ".*\\.ts$": TYPESCRIPT,
    "^build.gradle.kts$": KOTLIN,
    ".*\\.kt$": KOTLIN,
    "^pom.xml$": JAVA,
    "^build.gradle$": JAVA,
    ".*\\.java$": JAVA,
    "^requirements.txt$": PYTHON,
    "^poetry.lock$": PYTHON,
    "^Pipfile.lock$": PYTHON,
    ".*\\.py$": PYTHON,
    "^Dockerfile$": DOCKER,
    "^docker-compose.yaml$": DOCKER,
    "^docker-compose.yml$": DOCKER,
    ".*\\.sh$": BASH,
  };
  const languages = Object.entries(configFiles)
    .filter((config) => {
      const regex = new RegExp(config[0]);
      return files.some((file) => regex.test(file));
    })
    .map((config) => config[1]);
  return languages.length === 0 ? [OTHER] : [...new Set(languages)];
};

export const getLanguages = async (absolutePath: string) => {
  if ((await stat(absolutePath)).isDirectory()) {
    const paths = await readdir(absolutePath);
    return obtainLanguages(paths);
  } else {
    return obtainLanguages([basename(absolutePath)]);
  }
};
