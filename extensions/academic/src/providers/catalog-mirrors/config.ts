export type CatalogMirrorGroup = {
  id: "annas-archive" | "library-genesis";
  name: string;
  slumStatusPage: string;
  fallbackBases: string[];
  searchPath(query: string): string;
};

// Edit only this registry to add, remove or replace catalog mirrors. Adapters never
// expose file URLs: they return bibliographic record pages only.
export const CATALOG_MIRROR_GROUPS: CatalogMirrorGroup[] = [
  {
    id: "annas-archive",
    name: "Anna's Archive Catalog",
    slumStatusPage: "annas.html",
    fallbackBases: [
      "https://annas-archive.gl",
      "https://annas-archive.pk",
      "https://annas-archive.gd",
    ],
    searchPath: (query) => `/search?${new URLSearchParams({ q: query })}`,
  },
  {
    id: "library-genesis",
    name: "Library Genesis Catalog",
    slumStatusPage: "libgen.html",
    fallbackBases: [
      "https://libgen.bz",
      "https://libgen.gl",
      "https://libgen.la",
      "https://libgen.vg",
      "https://libgen.li",
    ],
    searchPath: (query) => `/index.php?${new URLSearchParams({ req: query })}`,
  },
];
