import { environment } from "@raycast/api";
import { join } from "path";
import { execSync } from "child_process";
import { SnippetType } from "./types";

export async function FMObjectsToXML() {
  const script = join(environment.assetsPath, "FmClipTools/clipboardToFM.applescript");
  const res = execSync("osascript " + script);
  return res.toString().replace("string:", "");
}
export function XMLToFMObjects() {
  const script = join(environment.assetsPath, "FmClipTools/FMToClipboard.applescript");
  const res = execSync("osascript " + script).toString();
  if (res.trim() === "No Error") return res;
  throw new Error(res);
}

export function detectType(snippet: string): SnippetType {
  if (snippet.includes("<Script")) return "script";
  if (snippet.includes("<Step")) return "scriptSteps";
  if (snippet.includes("<Layout")) return "layout";
  if (snippet.includes("<GroupButtonObj")) return "group";
  if (snippet.includes('<fmxmlsnippet type="LayoutObjectList')) return "layoutObjectList";
  if (snippet.includes("<BaseTable")) return "baseTable";
  if (snippet.includes("<CustomFunction")) return "customFunction";
  if (snippet.includes("<Field")) return "field";
  if (snippet.includes("<ValueList")) return "valueList";
  return "unknown";
}
