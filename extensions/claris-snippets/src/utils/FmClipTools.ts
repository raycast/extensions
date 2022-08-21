import { Clipboard, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

export async function FMObjectsToXML() {
  const script = join(environment.assetsPath, "FmClipTools/clipboardToFM.applescript");
  const res = execSync("osascript " + script).toString();
  // console.log(res);
  return res;
  const clip = await Clipboard.readText();
  return clip;
}
export function XMLToFMObjects() {
  return readFileSync(
    join(environment.assetsPath, "FmClipTools/fmClip - Clipboard XML to FM Objects.applescript"),
    "utf8"
  );
}
