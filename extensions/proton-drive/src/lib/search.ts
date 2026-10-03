import { DriveNode } from "./cli";
import { DriveIndex, entryToNode } from "./index";

const MAX_RESULTS = 200;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Every query word must appear in the name or the folder path (accent- and case-insensitive).
 * Name hits rank above path-only hits, prefix hits above substring hits.
 * Returns 0 when the item doesn't match.
 */
function score(name: string, path: string, words: string[]): number {
  let total = 0;
  for (const w of words) {
    const inName = name.indexOf(w);
    if (inName === 0) total += 4;
    else if (inName > 0) total += /[\s._\-()[\]]/.test(name[inName - 1]) ? 3 : 2;
    else if (path.includes(w)) total += 1;
    else return 0;
  }
  return total;
}

const words = (query: string) => fold(query).split(/\s+/).filter(Boolean);
const time = (modified: string | null | undefined) => (modified ? Date.parse(modified) : 0);

/** Filters the nodes of one folder listing. */
export function searchNodes(nodes: DriveNode[], query: string): DriveNode[] {
  const w = words(query);
  return nodes
    .map((node) => ({ node, s: score(fold(node.name), fold(node.parentPath), w) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || time(b.node.modified) - time(a.node.modified))
    .slice(0, MAX_RESULTS)
    .map((r) => r.node);
}

/** Folded names and folder paths, computed once per index (the index object is replaced on refresh). */
const folded = new WeakMap<DriveIndex, { names: string[]; folders: string[] }>();

/** Searches the whole-Drive index. Only the returned results are turned into full nodes. */
export function searchIndex(index: DriveIndex, query: string, limit = MAX_RESULTS): DriveNode[] {
  let f = folded.get(index);
  if (!f) {
    f = { names: index.entries.map((e) => fold(e[0])), folders: index.folders.map(fold) };
    folded.set(index, f);
  }
  const w = words(query);
  if (w.length === 0) return [];

  const hits: { i: number; s: number }[] = [];
  for (let i = 0; i < index.entries.length; i++) {
    const s = score(f.names[i], f.folders[index.entries[i][1]], w);
    if (s > 0) hits.push({ i, s });
  }
  return hits
    .sort((a, b) => b.s - a.s || time(index.entries[b.i][4]) - time(index.entries[a.i][4]))
    .slice(0, limit)
    .map((h) => entryToNode(index, h.i));
}
