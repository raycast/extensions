import { environment, showToast, Toast } from "@raycast/api";
import { readdirSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, PathLike } from "fs";
import { join } from "path";
import { FMObjectsToXML } from "./FmClipTools";
import { Location, Snippet, SnippetWithPath, ZSnippet } from "./types";
import { getLocationPath } from "./use-locations";

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

export function loadAllSnippets(locations?: Location[]): SnippetWithPath[] {
  const allSnippets: SnippetWithPath[] = [];
  locations?.forEach(async (location) => {
    allSnippets.push(...loadSnippets(location));
  });
  // plus default location
  allSnippets.push(...loadSnippets());
  return allSnippets;
}
export function loadSnippets(location?: Location): SnippetWithPath[] {
  const snippets: SnippetWithPath[] = [];
  const path = getLocationPath(location);
  if (!existsSync(path)) {
    // fail silently if folder doesn't exist
    console.error(`Snippets folder ${path} doesn't exist`);
    return [];
  }

  const files = listAllFilesRecursive(path);
  files.forEach((path) => {
    const data = readFileSync(path, "utf8").toString();
    try {
      const snippet = ZSnippet.safeParse(JSON.parse(data));
      if (snippet.success) {
        snippets.push({ ...snippet.data, path, locId: location?.id ?? "default" });
      }
    } catch {
      return;
    }
  });
  return snippets;
}

function listAllFilesRecursive(dir: PathLike): string[] {
  const files = readdirSync(dir, { withFileTypes: true });
  const fileNames = files.map((file) => {
    if (file.isDirectory()) {
      return listAllFilesRecursive(join(dir.toString(), file.name));
    } else {
      return join(dir.toString(), file.name);
    }
  });
  return fileNames.flat();
}

export async function saveSnippetFile(data: Snippet, location?: Location): Promise<boolean> {
  const parseResult = ZSnippet.safeParse(data);
  if (parseResult.success) {
    const snippet = parseResult.data;
    const path = location?.path ?? getDefaultPath();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { locId, ...rest } = snippet; // don't save locId to file

    writeFileSync(join(path, `${snippet.id}.json`), JSON.stringify(rest));
    return true;
  }
  console.error(parseResult.error);
  return false;
}

export async function deleteSnippetFile(snippet: SnippetWithPath) {
  rmSync(snippet.path);
}
