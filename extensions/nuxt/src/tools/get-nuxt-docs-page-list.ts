import NAV_TREE from "../data/nuxt-docs-nav";
import type { NuxtDocsLink, NuxtDocsNode } from "../types/docs";
import { flattenDocsTree } from "../utils/docs";

type Input = {
  // If true, returns flat list of { title, path } including all depths; otherwise returns tree
  flat?: boolean;
};

/**
 * Return the Nuxt documentation page list (tree or flattened), version-agnostic.
 * Paths are relative to the versioned base. Use with `flat: true` for search.
 */
export default async function tool(input: Input) {
  if (input?.flat) {
    const links: NuxtDocsLink[] = flattenDocsTree(NAV_TREE as NuxtDocsNode[]);
    return links;
  }

  return NAV_TREE;
}
