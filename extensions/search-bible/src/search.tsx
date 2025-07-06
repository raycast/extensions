import { Verse } from "./types";

let verseCache: Verse[] = [];

export const loadCache = async () => {
  verseCache = await loadVerses();
};

export const searchVerses = (query: string): Verse[] => {
  if (!query) return verseCache.slice(0, 20); // Return first 20 verses if no query

  const [bookChapterVerse, keyword] = query.split(" ").reduce(
    (acc, part) => {
      if (/\d/.test(part)) {
        acc[0] += `${part} `;
      } else {
        acc[1] += `${part} `;
      }
      return acc;
    },
    ["", ""],
  );

  let results = verseCache;

  if (bookChapterVerse.trim()) {
    const [book, chapterVerse] = bookChapterVerse.trim().split(".");
    if (chapterVerse) {
      const [chapter, verse] = chapterVerse.split(":");
      results = results.filter(
        (v) =>
          v.book_name.toLowerCase().includes(book.toLowerCase()) &&
          (!chapter || v.chapter === parseInt(chapter)) &&
          (!verse || v.verse === parseInt(verse)),
      );
    } else {
      results = results.filter((v) => v.book_name.toLowerCase().includes(book.toLowerCase()));
    }
  }

  if (keyword.trim()) {
    results = results.filter((v) => v.text.toLowerCase().includes(keyword.trim().toLowerCase()));
  }

  return results.slice(0, 20); // Limit results to 20
};
function loadVerses(): Verse[] | PromiseLike<Verse[]> {
  throw new Error("Function not implemented.");
}
