import { bookmarks } from "../data";

type Input = {
  /** Words in the bookmark's title, address or folder. */
  query: string;
};

/** Yab's bookmarks that match. */
export default async function tool(input: Input) {
  const words = (input.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return bookmarks()
    .filter((b) => words.every((w) => `${b.title} ${b.url} ${b.path.join(" ")}`.toLowerCase().includes(w)))
    .slice(0, 30)
    .map((b) => ({ title: b.title, url: b.url, folder: b.path.join(" › ") }));
}
