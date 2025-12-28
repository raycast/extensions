import { resolve } from "path";
import { environment } from "@raycast/api";

export const CACHE_DIR = resolve(environment.supportPath, "pages");

export const ZIP_URL = "https://github.com/tldr-pages/tldr/archive/refs/heads/main.zip";

export const PLATFORM_NAMES = ["osx", "common", "linux", "windows", "sunos", "android"];
