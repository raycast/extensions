/** Capture-line helpers for the Raycast command. Filing stays on the Mac listener. */

export const MAX_CAPTURE_LENGTH = 20_000
export const MAX_PICKER_ROWS = 50

export type TokenKind = "#" | "@" | "/"

export type OpenToken = {
  kind: TokenKind
  start: number
  end: number
  query: string
}

export type CatalogEntry = {
  id: string
  name: string
  path: string
}

export type CatalogPerson = {
  id: string
  name: string
}

export type Catalog = {
  brains: CatalogEntry[]
  tags: CatalogEntry[]
  people: CatalogPerson[]
  defaultBrain: CatalogEntry
}

export type PickerRow = {
  id: string
  role: "tuck" | "insert" | "hint"
  title: string
  subtitle: string
  slug?: string
}

function brainPattern() {
  return /(^|\s)\/([\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+){0,2})/gu
}

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

/** Up to three path segments. Slashes stay slashes so `#parent/child` still files. */
export function slugPathFromQuery(query: string): string {
  return query
    .split("/")
    .map((part) => slugify(part))
    .filter(Boolean)
    .slice(0, 3)
    .join("/")
}

export function tokenAtCursor(value: string, cursor: number): OpenToken | null {
  const before = value.slice(0, Math.max(0, cursor))
  let index = before.length - 1
  while (index >= 0) {
    const ch = before[index] ?? ""
    if (/[\p{L}\p{N}_-]/u.test(ch)) {
      index -= 1
      continue
    }
    if (ch === "/" && index > 0 && !/\s/.test(before[index - 1] ?? "")) {
      index -= 1
      continue
    }
    break
  }
  const marker = before[index]
  if (marker !== "#" && marker !== "@" && marker !== "/") return null
  if (index > 0 && !/\s/.test(before[index - 1] ?? "")) return null
  return {
    kind: marker,
    start: index,
    end: cursor,
    query: before.slice(index + 1),
  }
}

export function insertToken(value: string, token: OpenToken, slug: string): string {
  const before = value.slice(0, token.start)
  const after = value.slice(token.end)
  const spacer = after.startsWith(" ") || after.startsWith("\n") ? "" : " "
  return `${before}${token.kind}${slug}${spacer}${after}`
}

export function brainPathInLine(value: string): string | undefined {
  const matches = value.matchAll(brainPattern())
  let path: string | undefined
  for (const match of matches) path = match[2]
  return path
}

export function destinationName(line: string, catalog: Catalog | null): string {
  const path = brainPathInLine(line)
  if (path) {
    return catalog?.brains.find((brain) => brain.path === path)?.name ?? path
  }
  return catalog?.defaultBrain.name ?? "your default brain"
}

export type ListenerStatus = "ready" | "locked" | "offline" | "unauthorized" | "bad"

export function destinationSubtitle(input: { line: string; catalog: Catalog | null; status: ListenerStatus }): string {
  if (input.status === "unauthorized") return "That pair link was refused. Copy a new one from the Tuck menu."
  if (input.status === "offline") return "Open Tuck on this Mac"
  if (input.status === "bad") return "Tuck could not read names"
  const place = destinationName(input.line, input.catalog)
  if (input.status === "locked") return `Files in ${place} when the vault is unlocked`
  return `Files in ${place}`
}

export function pickerRows(
  line: string,
  input: { catalog: Catalog | null; status: ListenerStatus },
): { token: OpenToken | null; rows: PickerRow[] } {
  if (line.trim().length > MAX_CAPTURE_LENGTH) {
    return {
      token: null,
      rows: [{ id: "too-long", role: "hint", title: "That thought is too long", subtitle: "Shorten it, then tuck" }],
    }
  }

  const token = tokenAtCursor(line, line.length)
  if (!token) {
    if (!line.trim()) {
      return {
        token: null,
        rows: [{ id: "empty", role: "hint", title: "Type a thought", subtitle: "#tag    @person    /brain" }],
      }
    }
    return {
      token: null,
      rows: [
        {
          id: "tuck",
          role: "tuck",
          title: "Tuck this",
          subtitle: destinationSubtitle({ line, catalog: input.catalog, status: input.status }),
        },
      ],
    }
  }

  const matches = input.catalog ? matchToken(token, input.catalog) : []
  const rows: PickerRow[] = matches.map((match) => ({
    id: `${token.kind}${match.slug}:${match.title}`,
    role: "insert",
    title: match.title,
    subtitle: `${token.kind}${match.slug}`,
    slug: match.slug,
  }))

  const createSlug = token.kind === "@" ? slugify(token.query) : slugPathFromQuery(token.query)
  // Offered below the matches whenever the typed name itself is not there yet.
  if (token.query.trim() && createSlug && !matches.some((match) => match.slug === createSlug)) {
    rows.push({
      id: `create${token.kind}${createSlug}`,
      role: "insert",
      title: `Create ${token.kind}${createSlug}`,
      subtitle: "It stays in the thought",
      slug: createSlug,
    })
  }

  if (!rows.length) {
    const subtitle =
      input.status === "locked"
        ? "Names appear when the vault is unlocked"
        : input.status === "offline"
          ? "Open Tuck on this Mac"
          : input.status === "unauthorized"
            ? "That pair link was refused. Copy a new one from the Tuck menu."
            : input.status === "bad"
              ? "Tuck could not read names"
              : "Type a name, or tuck to create it"
    rows.push({
      id: "hint",
      role: "hint",
      title: token.kind === "@" ? "People" : token.kind === "/" ? "Brains" : "Tags",
      subtitle,
    })
  }

  return { token, rows }
}

type Ranked = { title: string; slug: string; score: number }

function matchToken(token: OpenToken, catalog: Catalog): Ranked[] {
  if (token.kind === "@") return matchPeople(token.query, catalog.people)
  const entries = token.kind === "/" ? catalog.brains : catalog.tags
  return matchEntries(token.query, entries)
}

function matchEntries(query: string, entries: CatalogEntry[]): Ranked[] {
  const needle = query.trim().toLowerCase()
  const slugNeedle = slugify(query)
  const prefix = slugPathFromQuery(query)
  const ranked = entries
    .map((entry) => {
      const name = entry.name.toLowerCase()
      const path = entry.path.toLowerCase()
      let score = 0
      if (!needle) score = 1
      else {
        if (path === prefix) score += 100
        else if (prefix && path.startsWith(prefix)) score += 70
        if (slugify(entry.name) === slugNeedle) score += 80
        else if (name.startsWith(needle)) score += 60
        else if (name.includes(needle)) score += 40
        if (path.split("/").some((part) => part.startsWith(slugNeedle))) score += 25
        if (path.includes(needle) || path.includes(slugNeedle)) score += 10
      }
      return { title: entry.name, slug: entry.path, score }
    })
    .filter((entry) => entry.score > 0)
  return sortRanked(ranked)
}

function matchPeople(query: string, people: CatalogPerson[]): Ranked[] {
  const needle = query.trim().toLowerCase()
  const slugNeedle = slugify(query)
  const ranked = people
    .map((person) => {
      const name = person.name.toLowerCase()
      const slug = slugify(person.name)
      let score = 0
      if (!needle) score = 1
      else if (!slug) score = 0
      else {
        if (slug === slugNeedle) score += 80
        else if (name.startsWith(needle)) score += 60
        else if (name.includes(needle)) score += 40
        if (slug.startsWith(slugNeedle)) score += 25
      }
      return { title: person.name, slug, score }
    })
    .filter((entry) => entry.score > 0 && entry.slug)
  return sortRanked(ranked)
}

function sortRanked(ranked: Ranked[]): Ranked[] {
  return ranked
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug))
    .slice(0, MAX_PICKER_ROWS)
}
