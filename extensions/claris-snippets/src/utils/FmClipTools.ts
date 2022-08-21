import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

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

type SnippetTypes = "unknown" | "script" | "scriptSteps" | "layoutObjectList";
export const snippetTypesMap: Record<SnippetTypes, string> = {
  script: "Script",
  scriptSteps: "Script Step(s)",
  layoutObjectList: "Layout Object(s)",
  unknown: "Unknown",
};

export function detectType(snippet: string): SnippetTypes {
  if (snippet.includes("<Script")) return "script";
  if (snippet.includes("<Step")) return "scriptSteps";
  if (snippet.includes('<fmxmlsnippet type="LayoutObjectList')) return "layoutObjectList";
  return "unknown";
}
