import { ScriptCommand, ScriptMetadatas } from "./types";
import fs from "fs/promises";
import { URL } from "url";

export function isValidUrl(text: string) {
  let url;
  try {
    url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ;
  } catch {
    return false;
  }
}


const metadataRegex = /@raycast\.(\w+)\s+(.+)$/gm;

export function parseMetadatas(script: string): ScriptMetadatas {
  const metadatas: Record<string, string> = {};
  const matches = [...script.matchAll(metadataRegex)];
  for (const match of matches) {
    const metadataTitle = match[1];
    const metatataValue = metadataTitle == 'selection' ? JSON.parse(match[2]) : match[2];
    metadatas[metadataTitle] = metatataValue;
  }

  return (metadatas as unknown) as ScriptMetadatas;
}

export async function loadScriptCommands(scriptFolder: string): Promise<ScriptCommand[]> {
  const paths = await fs.readdir(scriptFolder);
  return await Promise.all(
    paths.map(async (path) => {
      const scriptPath = `${scriptFolder}/${path}`;
      const script = await fs.readFile(scriptPath, "utf8");
      const metadatas = parseMetadatas(script);
      if (!metadatas.title)
        throw new Error(`Script ${path} has no title!`);
      if (!metadatas.selection)
        throw new Error(`Script ${path} has no selection!`);
      return { path: scriptPath, metadatas };
    })
  );
}
