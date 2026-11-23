import { getDisk } from "../lib/api";
import { words } from "../lib/ask";
import { diskEntries } from "../lib/disk";

type Input = {
  /** Words from the file's name or folder, for example "Q3 deck" or "invoices". */
  query: string;
};

/** Find files on the user's Floppy Disk by name or folder, newest first, with their fpy.sh links. */
export default async function tool({ query }: Input) {
  const terms = words(query);
  const entries = diskEntries(await getDisk());
  const matches = entries
    .map((e) => {
      const hay = [...e.folders, e.name, ...e.link.files.map((f) => f.path)].join(" ").toLowerCase();
      return { e, s: terms.filter((w) => hay.includes(w)).length };
    })
    .filter((m) => !terms.length || m.s > 0)
    .sort((a, b) => b.s - a.s || b.e.updatedAt.localeCompare(a.e.updatedAt))
    .slice(0, 20);
  return {
    files: matches.map(({ e }) => ({
      link_id: e.link.id,
      name: e.name,
      folder: e.folders.join("/"),
      url: e.link.url,
      files: e.link.files.length,
      updated_at: e.updatedAt,
    })),
    total: matches.length,
  };
}
