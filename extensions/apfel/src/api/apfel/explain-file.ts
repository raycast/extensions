import { readFileSync } from "fs";
import { apfelExplain } from "./explain";

const READABLE_EXTENSIONS = new Set([
  // code
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "rs",
  "go",
  "swift",
  "kt",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  // config
  "json",
  "yaml",
  "yml",
  "toml",
  "env",
  "ini",
  "cfg",
  // shell
  "sh",
  "zsh",
  "bash",
  "fish",
  // web
  "html",
  "css",
  "scss",
  "svg",
  // text
  "txt",
  "md",
  "mdx",
  "csv",
  "log",
]);

export const apfelExplainFile = async (path: string): Promise<string> => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  if (!READABLE_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: .${ext || "unknown"}`);
  }

  return await apfelExplain(readFileSync(path, "utf8"));
};
