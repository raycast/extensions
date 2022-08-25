import { environment } from "@raycast/api";
import { readdirSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync, PathLike } from "fs";
import { join } from "path";
import { Snippet, ZSnippet } from "./types";

function ensureDirSync(path: PathLike) {
  if (!existsSync(path)) mkdirSync(path);
}

export async function loadSnippets(): Promise<Snippet[]> {
  const snippets: Snippet[] = [];
  const path = join(environment.supportPath, "snippets");
  ensureDirSync(path);
  const files = readdirSync(path);
  files.forEach(async (file) => {
    const data = readFileSync(join(path, file), "utf8").toString();
    try {
      const snippet = await ZSnippet.safeParseAsync(JSON.parse(data));
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
  const path = join(environment.supportPath, "snippets");
  ensureDirSync(path);
  writeFileSync(join(path, `${snippet.id}.json`), JSON.stringify(snippet));
}

export async function deleteSnippetFile(snippet: Snippet) {
  const path = join(environment.supportPath, "snippets");
  ensureDirSync(path);
  rmSync(join(path, `${snippet.id}.json`));
}
