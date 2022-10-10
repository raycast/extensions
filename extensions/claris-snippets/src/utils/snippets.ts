import { environment, showToast, Toast } from "@raycast/api";
import { writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, PathLike } from "fs";
import { join } from "path";
import { FMObjectsToXML } from "./FmClipTools";
import { Location, Snippet, SnippetWithPath, ZSnippet } from "./types";
import { getLocationPath } from "./use-locations";
import readdirp from "readdirp";

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

export async function loadAllSnippets(locations?: Location[]): Promise<SnippetWithPath[]> {
  const allSnippets: SnippetWithPath[] = [];
  locations?.forEach(async (location) => {
    allSnippets.push(...(await loadSnippets(location)));
  });
  // plus default location
  allSnippets.push(...(await loadSnippets()));
  return allSnippets;
}
export async function loadSnippets(location?: Location): Promise<SnippetWithPath[]> {
  const snippets: SnippetWithPath[] = [];
  const path = getLocationPath(location);
  if (!existsSync(path)) {
    // fail silently if folder doesn't exist
    console.error(`Snippets folder ${path} doesn't exist`);
    return [];
  }

  // recursiveDir(path, (err, files) => {});

  const files = await readdirp.promise(path, { fileFilter: ["*.json"], directoryFilter: ["!.git"] });

  // files.on("data", (file) => {
  //   const { fullPath } = file;
  //   const data = readFileSync(fullPath, "utf8").toString();
  //   try {
  //     const snippet = ZSnippet.safeParse(JSON.parse(data));
  //     if (snippet.success) {
  //       snippets.push({ ...snippet.data, path: fullPath, locId: location?.id ?? "default" });
  //     }
  //   } catch {
  //     return;
  //   }
  // });

  // const files = readdirSync(path);
  // console.log({ files });
  files.forEach((file) => {
    const thePath = join(path, file.path);
    const data = readFileSync(thePath, "utf8").toString();
    try {
      const snippet = ZSnippet.safeParse(JSON.parse(data));
      if (snippet.success) {
        snippets.push({ ...snippet.data, path: thePath, locId: location?.id ?? "default" });
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
