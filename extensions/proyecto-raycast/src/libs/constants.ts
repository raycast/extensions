import { environment, getPreferenceValues } from "@raycast/api";
import { tmpdir } from "node:os";
import path from "node:path";

const { rootDir } = getPreferenceValues<Preferences>();
export const ROOT_NAME = path.basename(rootDir);

// Directory paths
export const ROOT_DIR = environment.isDevelopment ? path.join(tmpdir(), ROOT_NAME) : rootDir;

// Others
export const GITHUB_URL_PREFIX = "https://github.com/";
export const VSCODE_WORKSPACE_SUFFIX = ".code-workspace";
