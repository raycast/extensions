import { homedir } from "node:os";

export const FORK_BUNDLE_ID = "com.DanPristupov.Fork";
export const REPO_FILE_PATH = `${homedir()}/Library/Application Support/${FORK_BUNDLE_ID}/repositories.json`;
