import { getKasetState, recordFinishedTrack } from "./utils/kaset";

// Headless background recorder (no menu-bar item). Raycast keeps background
// refresh off until this command is opened once, or its preference is enabled.
export default async function Command() {
  const state = await getKasetState();
  await recordFinishedTrack(state?.currentTrack ?? null);
}
