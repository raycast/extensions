import { Cache, launchCommand, LaunchType, showHUD } from "@raycast/api";

const cache = new Cache();
const MENUBAR_FLAG = "life-menubar-hidden";

export default async function Command() {
  const wasHidden = cache.get(MENUBAR_FLAG) === "true";
  const nowHidden = !wasHidden;
  cache.set(MENUBAR_FLAG, String(nowHidden));
  let note = "";
  try {
    await launchCommand({ name: "life-menubar", type: LaunchType.Background });
  } catch (e) {
    // Surface the reason instead of failing silently; the 1-minute interval
    // will still apply the flag.
    note = ` — applies within a minute (${e instanceof Error ? e.message : "refresh unavailable"})`;
  }
  await showHUD(nowHidden ? `Menu bar hidden${note}` : `⌛ Menu bar shown${note}`);
}
