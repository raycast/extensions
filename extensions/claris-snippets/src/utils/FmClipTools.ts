import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { SnippetType } from "./types";

export async function FMObjectsToXML() {
  const script = join(environment.assetsPath, "FmClipTools/clipboardToFM.applescript");
  const res = execSync("osascript " + script);
  return res.toString().replace("string:", "");
}
export function XMLToFMObjects() {
  return readFileSync(
    join(environment.assetsPath, "FmClipTools/fmClip - Clipboard XML to FM Objects.applescript"),
    "utf8"
  );
}

export function detectType(snippet: string): SnippetType {
  if (snippet.includes("<Script")) return "script";
  if (snippet.includes("<Step")) return "scriptSteps";
  if (snippet.includes('<fmxmlsnippet type="LayoutObjectList')) return "layoutObjectList";
  return "unknown";
}
