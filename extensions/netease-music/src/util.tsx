import { showHUD } from "@raycast/api";

export async function controlMusic(f: () => Promise<void>) {
  try {
    await f();
    await showHUD("✅ success");
  } catch (e) {
    await showHUD(`❌ ${e}`);
  }
}
