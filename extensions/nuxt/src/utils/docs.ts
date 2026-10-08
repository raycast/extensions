import { $fetch } from "ofetch";
import type { NuxtDocsLink, NuxtDocsNode } from "../types/docs";
import { getNuxtDocsUrl } from "./search";

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

export async function fetchNuxtDocMarkdown(path: string): Promise<string> {
  const base = getNuxtDocsUrl();
  const normalized = path.replace(/\/(index)?$/, "");
  const mdPath = normalized.endsWith(".md") ? normalized : `${normalized}.md`;
  const rawBase = base.replace("/docs/", "/raw/docs/");
  const url = `${rawBase}${mdPath}`;

  return await $fetch<string>(url, {
    method: "GET",
    headers: { "Content-Type": "text/plain" },
  });
}
