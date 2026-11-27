import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { parse } from "smol-toml";

/**
 * forkz's saved sites and settings, read from its files (names, paths, and
 * addresses only: passwords are in the Keychain and never read). No
 * Raycast imports, so this can be tested with plain Node.
 */

/** Where forkz keeps its settings and saved sites. */
const SUPPORT = join(homedir(), "Library", "Application Support", "forkz");

/** A saved site (passwords are in the Keychain, and never read here). */
export interface Site {
  id: string;
  name: string;
  /** "sftp", "ftp", "s3", "dropbox", and so on. */
  protocol: string;
  host: string;
  user: string;
  /** The folder it opens in ("" for the login folder). */
  remoteDir: string;
  /** Its group in forkz's sidebar. */
  folder: string;
}

/** A folder: on the Mac (no site), or on a saved site (by its name). */
export interface Place {
  path: string;
  site?: Site;
}

export interface Named {
  name: string;
  /** What it covers, for the list ("~/Projects", "Website to Staging"). */
  detail: string;
}

export interface Settings {
  recent: Place[];
  favorites: Place[];
  synclets: Named[];
  smartFolders: Named[];
  workspaces: Named[];
}

type Table = Record<string, unknown>;

async function readToml(file: string): Promise<Table> {
  try {
    return parse(await readFile(join(SUPPORT, file), "utf8")) as Table;
  } catch (error) {
    // No file yet (forkz not run, or nothing saved): nothing to list.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function tables(value: unknown): Table[] {
  return Array.isArray(value) ? value.filter((item): item is Table => typeof item === "object" && item !== null) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The saved sites, by name. */
export async function readSites(): Promise<Site[]> {
  const data = await readToml("sites.toml");
  return tables(data.site)
    .map((site) => ({
      id: text(site.id),
      name: text(site.name),
      protocol: text(site.protocol) || "sftp",
      host: text(site.host),
      user: text(site.user),
      remoteDir: text(site.remote_dir),
      folder: text(site.folder),
    }))
    .filter((site) => site.name !== "")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** "~/Documents" for a folder in the home folder. */
export function tilde(path: string): string {
  const home = homedir();
  if (path === home) {
    return "~";
  }
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** A tab's folder in a synclet or workspace ("Staging: /var/www"). */
function tabText(tab: unknown, sites: Site[]): string {
  if (typeof tab !== "object" || tab === null) {
    return "";
  }
  const { path, site } = tab as Table;
  const where = sites.find((s) => s.id === text(site))?.name;
  return where ? `${where}: ${text(path)}` : tilde(text(path));
}

/** What forkz's settings list: recent folders, favorites, and saved items. */
export async function readSettings(): Promise<Settings> {
  const [data, sites] = await Promise.all([readToml("settings.toml"), readSites()]);
  const siteOf = (id: unknown) => sites.find((site) => site.id === text(id));
  // A server folder whose site was deleted cannot be opened: left out.
  const recent: Place[] = tables(data.recent_folders)
    .filter((folder) => text(folder.path) !== "" && (text(folder.site) === "" || siteOf(folder.site)))
    .map((folder) => ({ path: text(folder.path), site: siteOf(folder.site) }));
  // As the sidebar lists them: the standard places, then the user's own,
  // then folders on saved sites (left out if the site was deleted).
  const home = homedir();
  const standard = [home, ...["Desktop", "Documents", "Downloads"].map((name) => join(home, name)), "/Applications"];
  const favorites: Place[] = [
    ...standard.map((path) => ({ path })),
    ...(Array.isArray(data.favorites) ? data.favorites.map((path) => ({ path: text(path) })) : []),
    ...tables(data.remote_favorites)
      .filter((favorite) => siteOf(favorite.site_id))
      .map((favorite) => ({ path: text(favorite.path), site: siteOf(favorite.site_id) })),
  ];
  const named = (items: unknown, detail: (item: Table) => string) =>
    tables(items)
      .map((item) => ({ name: text(item.name), detail: detail(item) }))
      .filter((item) => item.name !== "");
  return {
    recent,
    favorites: favorites.filter((place) => place.path !== ""),
    synclets: named(data.synclets, (item) => `${tabText(item.left, sites)} → ${tabText(item.right, sites)}`),
    smartFolders: named(data.smart_folders, (item) => tilde(text(item.folder))),
    workspaces: named(data.workspaces, (item) => {
      const panes = [item.left, item.right].filter((pane): pane is Table => typeof pane === "object" && pane !== null);
      const count = panes.reduce((total, pane) => total + tables(pane.tabs).length, 0);
      return count === 1 ? "1 tab" : `${count} tabs`;
    }),
  };
}

/** forkz's scheme for each protocol (as in its addresses). */
const SCHEMES: Record<string, string> = {
  "ftp-plain": "ftp",
  webdav: "dav",
  webdavs: "davs",
  "s3-http": "s3",
  "google-drive": "gdrive",
};

/** Cloud drives signed in to in the browser: shown by name. */
const SERVICES: Record<string, string> = { box: "Box", dropbox: "Dropbox", "google-drive": "Google Drive" };

/** A site's address for the list ("sftp://deploy@example.com/var/www"). */
export function address(site: Site): string {
  const service = SERVICES[site.protocol];
  if (service) {
    return site.remoteDir ? `${service}: ${site.remoteDir}` : service;
  }
  const scheme = SCHEMES[site.protocol] ?? site.protocol;
  const user = site.user ? `${site.user}@` : "";
  const folder = site.remoteDir ? `/${site.remoteDir.replace(/^\/+/, "")}` : "";
  return `${scheme}://${user}${site.host}${folder}`;
}
