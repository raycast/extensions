import { environment } from "@raycast/api";
import { sep } from "path";

export const { supportPath, assetsPath } = environment;
const bundleId = supportPath.split(sep).find((comp) => comp.startsWith("com.raycast")) ?? "com.raycast.macos";
const askpassScript = `${assetsPath}/scripts/askpass`;
export const env = Object.assign({}, process.env, { SUDO_ASKPASS: askpassScript, RAYCAST_BUNDLE: bundleId });
