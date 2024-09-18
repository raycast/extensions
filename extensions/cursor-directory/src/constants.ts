import { environment } from "@raycast/api";
import path from "path";

export const REPO_OWNER = "pontusab";
export const REPO_NAME = "cursor.directory";

export const URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/data/rules`;

export const PATH = !environment.isDevelopment
  ? environment.supportPath + "/prompts.json"
  : path.join(__dirname, "..", "cursor-directory", "prompts.json");
