import { environment } from "@raycast/api";
import { readdirSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, PathLike } from "fs";
import { join } from "path";
import { Location, Snippet, ZSnippet } from "./types";

function ensureDirSync(path: PathLike) {
  if (!existsSync(path)) mkdirSync(path);
}

export function getDefaultPath(): string {
  const path = join(environment.supportPath, "snippets");
  ensureDirSync(path);
  return path;
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

export async function saveSnippetFile(snippet: Snippet) {
  const path = getDefaultPath();
  writeFileSync(join(path, `${snippet.id}.json`), JSON.stringify(snippet));
}

export async function deleteSnippetFile(snippet: Snippet) {
  const path = getDefaultPath();
  rmSync(join(path, `${snippet.id}.json`));
}
