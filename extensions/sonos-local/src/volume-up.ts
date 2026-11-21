import { changeGroupVolume, volumeStep } from "./api";
import { quick } from "./quick";

export default () => quick(async (g) => `🔊 ${g.name}: ${await changeGroupVolume(g, volumeStep())}`);
