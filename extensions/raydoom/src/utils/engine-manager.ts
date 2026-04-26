import { environment, showToast, Toast } from "@raycast/api";
import { join } from "path";
import { existsSync, writeFileSync, unlinkSync } from "fs";

const GITHUB_RELEASES_URL = "https://api.github.com/repos/Saketh-Chandra/raydoom-core/releases";

// In dev mode: pick the most recent release including pre-releases.
// In production: pick the latest stable release only.
function getApiUrl(): string {
  return environment.isDevelopment ? GITHUB_RELEASES_URL : `${GITHUB_RELEASES_URL}/latest`;
}

type GithubRelease = { assets: Array<{ name: string; browser_download_url: string }> };

const ENGINE_JS_PATH = join(environment.supportPath, "doom.js");
const ENGINE_WASM_PATH = join(environment.supportPath, "doom.wasm");

export async function ensureEngineFiles(): Promise<boolean> {
  if (areEngineFilesDownloaded()) return true;

  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading DOOM Engine",
    message: "~740KB - First launch only",
  });

  try {
    // Fetch release metadata — latest stable in prod, most recent (inc. pre-release) in dev
    const apiResponse = await fetch(getApiUrl(), {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!apiResponse.ok) {
      throw new Error(`GitHub API request failed (HTTP ${apiResponse.status})`);
    }

    const data = await apiResponse.json();
    // /releases returns an array; /releases/latest returns a single object
    const release: GithubRelease = Array.isArray(data) ? data[0] : data;

    const jsAsset = release.assets.find((a) => a.name === "doom.js");
    const wasmAsset = release.assets.find((a) => a.name === "doom.wasm");

    if (!jsAsset || !wasmAsset) {
      throw new Error("Release assets doom.js / doom.wasm not found in latest release");
    }

    // Download doom.js
    const jsResponse = await fetch(jsAsset.browser_download_url);
    if (!jsResponse.ok) throw new Error(`doom.js download failed (HTTP ${jsResponse.status})`);
    const jsBuffer = await jsResponse.arrayBuffer();
    writeFileSync(ENGINE_JS_PATH, Buffer.from(jsBuffer));

    // Download doom.wasm
    const wasmResponse = await fetch(wasmAsset.browser_download_url);
    if (!wasmResponse.ok) throw new Error(`doom.wasm download failed (HTTP ${wasmResponse.status})`);
    const wasmBuffer = await wasmResponse.arrayBuffer();
    writeFileSync(ENGINE_WASM_PATH, Buffer.from(wasmBuffer));

    await showToast({
      style: Toast.Style.Success,
      title: "Engine Ready",
      message: "Starting DOOM...",
    });

    return true;
  } catch (error) {
    console.error("[EngineManager] Download failed:", error);

    // Clean up any partial files
    if (existsSync(ENGINE_JS_PATH)) unlinkSync(ENGINE_JS_PATH);
    if (existsSync(ENGINE_WASM_PATH)) unlinkSync(ENGINE_WASM_PATH);

    await showToast({
      style: Toast.Style.Failure,
      title: "Download Failed",
      message: "Failed to download engine. Check your internet connection.",
    });

    return false;
  }
}

export function areEngineFilesDownloaded(): boolean {
  return existsSync(ENGINE_JS_PATH) && existsSync(ENGINE_WASM_PATH);
}

export function getEngineAssetsPath(): string {
  return environment.supportPath;
}
