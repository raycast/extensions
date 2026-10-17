import { loadRecents } from "../lib/raycast-glue";

export default async function tool(): Promise<
  { path: string; viewedAt: string }[]
> {
  const recents = await loadRecents();
  return recents.map((entry) => ({
    path: entry.path,
    viewedAt: new Date(entry.ts).toISOString(),
  }));
}
