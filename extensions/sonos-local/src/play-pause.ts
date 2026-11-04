import { togglePlay } from "./api";
import { quick } from "./quick";

export default () => quick(async (g) => ((await togglePlay(g)) === "PLAYING" ? `▶︎ ${g.name}` : `⏸ ${g.name}`));
