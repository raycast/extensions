import { ScriptCommand, ScriptMetadatas } from "./types";
import fs from "fs/promises"
import { URL } from "url";

const metadataRegex = /@raycast\.(\w+)\s+(.+)$/gm;


export function isValidUrl(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch (e) {
        return false;
    }
}

export function parseMetadatas(script: string): ScriptMetadatas {
    const metadatas: Record<string, string> = {}
    const matches = [...script.matchAll(metadataRegex)];
    for (const match of matches) {
        const metadataTitle = match[1];
        const metatataValue = metadataTitle.startsWith("argument") ? JSON.parse(match[2]) : match[2];
        metadatas[metadataTitle] = metatataValue;
    }
    if (!metadatas.title) {
        throw Error("Script must have a title!");
    }

    return metadatas as unknown as ScriptMetadatas;
}

export async function loadScriptCommands(scriptFolder: string): Promise<ScriptCommand[]> {
    const paths = await fs.readdir(scriptFolder);
    return await Promise.all(paths.map(async path => {
        const scriptPath = `${scriptFolder}/${path}`;
        const script = await fs.readFile(scriptPath, "utf8");
        const metadatas = parseMetadatas(script);
        return {path: scriptPath, metadatas}
    }));
}
