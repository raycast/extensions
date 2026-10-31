import { downloads } from "../data";

type Input = {
  /** Words in the file's name, or the site it came from. Empty lists the newest. */
  query: string;
};

/** Files downloaded in Yab, newest first: name, path, the site and page it came from, and whether it is still there. */
export default async function tool(input: Input) {
  const words = (input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return downloads()
    .filter((d) => words.every((w) => `${d.name} ${d.from} ${d.pageTitle ?? ""}`.toLowerCase().includes(w)))
    .slice(0, 30)
    .map((d) => ({
      name: d.name,
      path: d.path,
      from: d.from,
      page: d.page,
      date: d.date?.toISOString(),
      stillThere: d.exists,
    }));
}
