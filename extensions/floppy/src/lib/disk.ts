// The disk as a flat list of entries, one per link, with the path Floppy for Mac shows it under.
// Naming follows Floppy for Mac (DiskNaming in apps/mac): the space's folder at the top ("My files"
// or the team's name), then its folders, then the link: a one-file link under the link's name when
// it ends in the file's extension, else under the file's name; a link with several files is a folder.
import { existsSync } from "fs";
import { join } from "path";
import type { DiskFile, DiskLink, DiskListing } from "./api";
import { DISK_MOUNT } from "./config";

export type DiskEntry = {
  link: DiskLink;
  /** The name Finder shows. */
  name: string;
  /** Space and folders above it, e.g. ["My files", "Decks"]. */
  folders: string[];
  /** Its path on the mounted disk, when Floppy for Mac has the disk mounted and the item is there. */
  localPath: string | null;
  size: number;
  updatedAt: string;
};

function ext(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

function sanitize(name: string) {
  let s = name.replace(/\//g, ":").replace(/\0/g, "");
  if (!s) s = "Untitled";
  if (s === "." || s === "..") s = "_";
  return s;
}

export function displayName(link: Pick<DiskLink, "name" | "files">): string {
  if (link.files.length !== 1) return sanitize(link.name);
  const fileName = link.files[0].path.split("/").pop() ?? link.files[0].path;
  if (link.name && ext(fileName).toLowerCase() === ext(link.name).toLowerCase()) return sanitize(link.name);
  return sanitize(fileName);
}

export function diskEntries(listing: DiskListing): DiskEntry[] {
  const spaces = new Map(listing.spaces.map((s) => [s.id, s.name]));
  const folders = new Map(listing.folders.map((f) => [f.id, f]));
  const chain = (folderId: string | null): string[] => {
    const names: string[] = [];
    const seen = new Set<string>();
    for (let id = folderId; id && !seen.has(id); id = folders.get(id)?.parent_id ?? null) {
      seen.add(id);
      const f = folders.get(id);
      if (!f) break;
      names.unshift(sanitize(f.name));
    }
    return names;
  };
  const mounted = existsSync(DISK_MOUNT) && listing.spaces.some((s) => existsSync(join(DISK_MOUNT, sanitize(s.name))));
  const placed = listing.links.map((link) => {
    const name = displayName(link);
    const above = [sanitize(spaces.get(link.space_id) ?? "My files"), ...chain(link.folder_id)];
    return { link, name, above, path: join(DISK_MOUNT, ...above, name) };
  });
  // Two links with one name in one folder show as "deck.pdf" and "deck (2).pdf"; which is which
  // isn't knowable from here, so neither gets a Finder path
  const taken = new Map<string, number>();
  for (const p of placed) taken.set(p.path.toLowerCase(), (taken.get(p.path.toLowerCase()) ?? 0) + 1);
  return placed
    .map(({ link, name, above, path }) => ({
      link,
      name,
      folders: above,
      localPath: mounted && taken.get(path.toLowerCase()) === 1 && existsSync(path) ? path : null,
      size: link.files.reduce((n, f) => n + f.size, 0),
      updatedAt: link.updated_at,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const TEXT_EXTENSIONS = new Set(["md", "markdown", "txt", "csv", "tsv", "json", "html", "htm", "xml", "yaml", "yml"]);

/** Plain text, Markdown, CSV, JSON, HTML, XML or YAML: files Ask Floppy can read. */
export function isText(file: DiskFile) {
  if (file.content_type?.startsWith("text/")) return true;
  if (file.content_type && /json|xml|yaml/.test(file.content_type)) return true;
  return TEXT_EXTENSIONS.has(ext(file.path).toLowerCase());
}
