import { extname } from "node:path";

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".fish": "bash",
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".py": "python",
  ".rb": "ruby",
  ".pl": "perl",
  ".php": "php",
  ".swift": "swift",
  ".applescript": "applescript",
  ".scpt": "applescript",
  ".osascript": "applescript",
};

export const languageForScript = (path: string) => LANGUAGE_BY_EXTENSION[extname(path).toLowerCase()] ?? "";
