import { Item } from "./types";
import Fuse from "fuse.js";

const parseQuery = (q: string) => {
  const queryItems = q.split(" ");
  const qs = queryItems.filter((c) => !c.startsWith("."));
  const ts = queryItems.filter((c) => c.startsWith("."));

  let qss = "";
  if (qs.length > 0) {
    qss = qs.join(" ");
  }

  let tss: string[] = [];
  if (ts.length > 0) {
    tss = ts.map((x) => x.substring(1));
  }

  return { qss, tss };
};

export function filterFct(items: Item[], searchText: string) {
  const { qss, tss } = parseQuery(searchText);

  if (!qss.trim() && tss.length < 1) {
    return items;
  }

  const options = {
    isCaseSensitive: false,
    includeScore: false,
    shouldSort: true,
    includeMatches: false,
    findAllMatches: true,
    minMatchCharLength: 1,
    threshold: 0.1,
    ignoreLocation: true,
    keys: [
      {
        name: "title",
        weight: 1,
      },
      {
        name: "uid",
        weight: 5,
      },
      {
        name: "tags",
        weight: 2,
      },
      {
        name: "year",
        weight: 3,
      },
      {
        name: "authors_tag",
        weight: 4,
      },
      {
        name: "keywords",
        weight: 4,
      },
    ],
  };

  const query: Fuse.Expression = {
    $and: qss
      .split(" ")
      .map((k) => k.trim())
      .filter(Boolean)
      .map((z) => ({
        $or: options.keys.map((x) => Object.fromEntries(new Map([[x.name, z.replace(/\+/gi, " ")]]))),
      })),
  };

  if (tss.length > 0 && query["$and"]) {
    query["$and"].push({ $and: tss.map((x) => ({ tags: x.replace(/\+/gi, " ") })) });
  }

  return new Fuse(items, options).search(query).map((x) => x.item);
}
