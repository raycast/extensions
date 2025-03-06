import { environment } from "@raycast/api";
import { execFileSync, execSync } from "child_process";
import { scrollBarOutputToValueMap } from "../data/constants";
import { ScrollBarValue } from "../types";

export function setScrollBarsVisibility(value: ScrollBarValue) {
  const scriptPath = `${environment.assetsPath}/scripts/set-scroll-bars-visibility`;
  execSync(`chmod +x ${scriptPath}`);
  execFileSync(scriptPath, [value]);
}

export function getCurrentScrollBarsVisibility() {
  const buffer = execSync("defaults read NSGlobalDomain AppleShowScrollBars");
  const output = buffer.toString().replace(/[\r\n]/gm, "");
  return scrollBarOutputToValueMap[output];
}
