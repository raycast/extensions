import { homedir } from "node:os";

export const FORK_BUNDLE_ID = "com.DanPristupov.Fork";
export const REPO_FILE_PATH_TOML = `${homedir()}/Library/Application Support/${FORK_BUNDLE_ID}/repositories.toml`;
export const REPO_FILE_PATH_JSON = `${homedir()}/Library/Application Support/${FORK_BUNDLE_ID}/repositories.json`;
export const REPO_FILE_PATHS = [REPO_FILE_PATH_TOML, REPO_FILE_PATH_JSON];
