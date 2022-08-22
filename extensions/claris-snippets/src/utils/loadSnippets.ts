import { environment } from "@raycast/api";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { Snippet, ZSnippet } from "./types";

export async function loadSnippets() {
  const snippets: Snippet[] = [];
  const files = readdirSync(environment.supportPath);
  files.forEach(async (file) => {
    const data = readFileSync(join(environment.supportPath, file), "utf8").toString();
    const snippet = await ZSnippet.safeParseAsync(JSON.parse(data));
    console.log(snippet);
    if (snippet.success) {
      snippets.push(snippet.data);
    }
  });
  return snippets;
}
