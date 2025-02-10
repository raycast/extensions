import { environment, Clipboard } from "@raycast/api";
import { join } from "path";
import { execSync } from "child_process";
import { SnippetType } from "./types";
import xml2js from "xml2js";

function minifyXML(xmlString: string) {
  return new Promise<string>((resolve, reject) => {
    const parser = new xml2js.Parser({
      preserveChildrenOrder: true,
      explicitArray: false,
      explicitChildren: false,
    });
    const builder = new xml2js.Builder({
      renderOpts: { pretty: false },
      headless: true,
    });

    parser.parseString(xmlString, (err, parsedXML) => {
      if (err) {
        reject(err);
      } else {
        const minifiedXML = builder.buildObject(parsedXML);
        resolve(minifiedXML);
      }
    });
  });
}

export async function FMObjectsToXML() {
  const script = join(environment.assetsPath, "FmClipTools/clipboardToFM.applescript");
  const res = execSync("osascript " + script);
  return res.toString().replace("string:", "").split(", «class")[0];
}
export async function XMLToFMObjects(snippet: string) {
  await Clipboard.copy(await minifyXML(snippet));
  const script = join(environment.assetsPath, "FmClipTools/FMToClipboard.applescript");
  const res = execSync("osascript " + script).toString();
  if (res.trim() === "true") return;
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
