import type { NuxtDocsLink, NuxtDocsNode } from "../types/docs";

// Flatten the docs tree to a simple list of { title, path } including all depths
export function flattenDocsTree(tree: NuxtDocsNode[]): NuxtDocsLink[] {
  const flat: NuxtDocsLink[] = [];
  const stack: NuxtDocsNode[] = [...tree];

  while (stack.length) {
    const node = stack.pop() as NuxtDocsNode;
    if (!node) continue;

    if (node.title && node.path) {
      flat.push({ title: node.title, path: node.path });
    }

    if (node.children && node.children.length) {
      for (let i = 0; i < node.children.length; i++) stack.push(node.children[i]);
    }
  }

  return flat;
}
