import { environment, showToast, Toast } from "@raycast/api";
import { readdirSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, PathLike } from "fs";
import { join } from "path";
import { date } from "zod";
import { FMObjectsToXML } from "./FmClipTools";
import { Location, Snippet, ZSnippet } from "./types";

function ensureDirSync(path: PathLike) {
  if (!existsSync(path)) mkdirSync(path);
}

export function getDefaultPath(): string {
  const path = join(environment.supportPath, "snippets");
  ensureDirSync(path);
  return path;
}

export async function getFromClipboard(): Promise<string | null> {
  const toast = await showToast({ title: "Getting snippet...", style: Toast.Style.Animated });
  try {
    const data = await FMObjectsToXML();
    toast.hide();
    return data;
  } catch (e) {
    toast.message = "Error getting snippet";
    toast.style = Toast.Style.Failure;
  }
  return null;
}

export function loadAllSnippets(locations?: Location[]): Snippet[] {
  const allSnippets: Snippet[] = [];
  locations?.forEach((location) => {
    allSnippets.push(...loadSnippets(location));
  });
  // plus default location
  allSnippets.push(...loadSnippets());
  return allSnippets;
}
export function loadSnippets(location?: Location): Snippet[] {
  const snippets: Snippet[] = [];
  const path = location?.path ?? getDefaultPath();
  if (!existsSync(path)) {
    // fail silently if folder doesn't exist
    console.error(`Snippets folder ${path} doesn't exist`);
    return [];
  }
  const files = readdirSync(path);
  files.forEach((file) => {
    const data = readFileSync(join(path, file), "utf8").toString();
    try {
      const snippet = ZSnippet.safeParse(JSON.parse(data));
      if (snippet.success) {
        snippets.push(snippet.data);
      }
    } catch {
      return;
    }
  });
  return snippets;
}

export async function saveSnippetFile(data: Snippet, location?: Location): Promise<boolean> {
  const parseResult = ZSnippet.safeParse(data);
  if (parseResult.success) {
    const snippet = parseResult.data;
    const path = location?.path ?? getDefaultPath();
    snippet.locId = location?.id ?? "default"; //ensure locId is set and matches the location passed in
    writeFileSync(join(path, `${snippet.id}.json`), JSON.stringify(snippet));
    return true;
  }
  console.error(parseResult.error);
  return false;
}

export async function deleteSnippetFile(snippet: Snippet) {
  const path = getDefaultPath();
  rmSync(join(path, `${snippet.id}.json`));
}
