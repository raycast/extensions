import type { Package, SearchResultDocument } from "@/types";

export const packageToSearchResultDocument = (pkg: Package): SearchResultDocument => {
  return {
    scope: pkg.scope,
    name: pkg.name,
    description: pkg.description,
    runtimeCompat: pkg.runtimeCompat,
    score: pkg.score ?? undefined,
    _omc: 0,
    id: `@${pkg.scope}/${pkg.name}`,
  };
};
