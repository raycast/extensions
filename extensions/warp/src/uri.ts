import { open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const warpUri = (path: string) => `warp://${path}`;

export const newTab = (path: string) => warpUri(`action/new_tab?path=${encodeURIComponent(path)}`);
export const newWindow = (path: string) => warpUri(`action/new_window?path=${encodeURIComponent(path)}`);
export const launchConfig = (path: string) => warpUri(`launch/${encodeURIComponent(path)}`);

export const openWarp = async () => {
  await runAppleScript('activate application id "dev.warp.Warp-Stable"');
};

export const openUri = async (uri: string) => {
  await openWarp();
  await open(uri);
};
