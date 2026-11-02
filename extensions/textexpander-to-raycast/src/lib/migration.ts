import { snippetWarnings } from "./converter";
import { migrationSessionSchema, type MigrationSession, type PreviewSnippet, type RaycastSnippet } from "./types";

export function reviewSnippets(session: MigrationSession): PreviewSnippet[] {
  const items = session.conversion.snippets.map((item) => {
    const edit = Object.hasOwn(session.edits, item.id) ? session.edits[item.id] : undefined;
    const snippet = { ...(edit ?? item.snippet) };
    const prefix = `[${item.group}] `;
    const group =
      (Object.hasOwn(session.groupNames, item.group) ? session.groupNames[item.group] : undefined) ?? item.group;
    if (session.prefixGroups && group !== item.group && snippet.name.startsWith(prefix)) {
      snippet.name = group ? `[${group}] ${snippet.name.slice(prefix.length)}` : snippet.name.slice(prefix.length);
    }
    const changes =
      snippet.text === item.snippet.text
        ? [...item.changes]
        : snippet.text !== item.original.text
          ? ["Text edited manually."]
          : [];
    if (snippet.name !== item.original.name) changes.push("Name changed.");
    if (snippet.keyword !== item.original.keyword) changes.push("Keyword changed.");
    return { ...item, group, snippet, changes, warnings: snippetWarnings(snippet, item.kind) };
  });
  const selected = new Set(session.selectedIds);
  const counts = new Map<string, number>();
  const existing = new Set(session.existing.map((item) => item.keyword).filter(Boolean));
  for (const item of items) {
    const keyword = item.snippet.keyword;
    if (selected.has(item.id) && keyword) counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
  }
  for (const item of items) {
    const keyword = item.snippet.keyword;
    if (!selected.has(item.id) || !keyword) continue;
    if ((counts.get(keyword) ?? 0) > 1)
      item.warnings.push({
        code: "keyword-conflict",
        level: "warning",
        message: "Another selected snippet uses the same keyword.",
      });
    if (existing.has(keyword))
      item.warnings.push({
        code: "existing-conflict",
        level: "warning",
        message:
          "A snippet in the supplied Raycast export uses this keyword. Rename or exclude this snippet before importing.",
      });
  }
  return items;
}

export function filterSnippets(
  items: PreviewSnippet[],
  options: { group: string; filter: string; search: string; selectedIds: string[] },
) {
  const selected = new Set(options.selectedIds);
  const words = options.search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (options.group && item.group !== options.group) return false;
    const searchable =
      `${item.snippet.name}\n${item.snippet.keyword ?? ""}\n${item.group}\n${item.snippet.text}`.toLocaleLowerCase();
    if (!words.every((word) => searchable.includes(word))) return false;
    switch (options.filter) {
      case "ready":
        return !item.warnings.some((warning) => warning.level === "warning");
      case "warnings":
        return item.warnings.some((warning) => warning.level === "warning");
      case "conflicts":
        return item.warnings.some(
          (warning) => warning.code === "keyword-conflict" || warning.code === "existing-conflict",
        );
      case "selected":
        return selected.has(item.id);
      case "excluded":
        return !selected.has(item.id);
      case "all":
        return true;
      default:
        return item.warnings.some((warning) => warning.code === options.filter);
    }
  });
}

export function selectSnippets(session: MigrationSession, ids: string[], include: boolean): MigrationSession {
  const selected = new Set(session.selectedIds);
  for (const id of ids) {
    if (include) selected.add(id);
    else selected.delete(id);
  }
  return { ...session, selectedIds: [...selected] };
}

export function keepConflict(session: MigrationSession, keyword: string, keepId?: string): MigrationSession {
  const competing = reviewSnippets(session)
    .filter((item) => item.snippet.keyword === keyword)
    .map((item) => item.id);
  const next = selectSnippets(session, competing, false);
  return keepId ? selectSnippets(next, [keepId], true) : next;
}

export function updateSnippet(session: MigrationSession, id: string, snippet: RaycastSnippet): MigrationSession {
  const source = session.conversion.snippets.find((item) => item.id === id);
  const groupName =
    source && Object.hasOwn(session.groupNames, source.group) ? session.groupNames[source.group] : undefined;
  const currentPrefix = `[${groupName}] `;
  const name =
    source &&
    session.prefixGroups &&
    source.group !== "Ungrouped" &&
    groupName &&
    snippet.name.startsWith(currentPrefix)
      ? `[${source.group}] ${snippet.name.slice(currentPrefix.length)}`
      : snippet.name;
  return { ...session, edits: { ...session.edits, [id]: { ...snippet, name } } };
}

export function restoreSnippet(session: MigrationSession, id: string): MigrationSession {
  const edits = { ...session.edits };
  delete edits[id];
  return { ...session, edits };
}

export function parseSession(text: string): MigrationSession {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Saved progress is damaged. Delete it and start a new migration.");
  }
  const result = migrationSessionSchema.safeParse(value);
  if (!result.success)
    throw new Error("Saved progress is incompatible or damaged. Delete it and start a new migration.");
  const session = result.data;
  const ids = new Set(session.conversion.snippets.map((item) => item.id));
  if (
    ids.size !== session.conversion.snippets.length ||
    new Set(session.selectedIds).size !== session.selectedIds.length ||
    !session.selectedIds.every((id) => ids.has(id)) ||
    !Object.keys(session.edits).every((id) => ids.has(id))
  ) {
    throw new Error("Saved progress contains invalid snippet references. Start a new migration.");
  }
  return session;
}

export function serializeSession(session: MigrationSession): string {
  return JSON.stringify(migrationSessionSchema.parse(session));
}

export function migrationReport(session: MigrationSession, exported = false) {
  const selected = new Set(session.selectedIds);
  const items = reviewSnippets(session);
  return {
    createdAt: new Date().toISOString(),
    sources: session.sources,
    referencePath: session.referencePath,
    summary: {
      selected: items.filter((item) => selected.has(item.id)).length,
      exported: exported ? items.filter((item) => selected.has(item.id)).length : 0,
      excluded: items.filter((item) => !selected.has(item.id)).length,
      empty: session.conversion.emptyCount,
      duplicates: session.conversion.duplicateCount,
      suggested: session.conversion.suggestedCount,
    },
    entries: [
      ...items.map((item) => ({
        id: item.id,
        name: item.snippet.name,
        keyword: item.snippet.keyword,
        group: item.group,
        sourcePath: item.sourcePath,
        status: selected.has(item.id) ? (exported ? "exported" : "selected") : "excluded",
        warnings: item.warnings,
        changes: item.changes,
      })),
      ...session.conversion.skipped.map((item) => ({ ...item, status: item.reason })),
    ],
    note: "Snippet bodies are omitted. Suggested Snippets are excluded before conversion and reported only as counts per source.",
  };
}
