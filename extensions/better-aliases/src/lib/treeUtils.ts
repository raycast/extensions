import type { BetterAliasesConfig } from "../schemas/betterAliases.schema";

export interface AliasNode {
  key: string;
  fullAlias: string;
  label?: string;
  value?: string;
  children: Record<string, AliasNode>;
}

export function buildAliasTree(config: BetterAliasesConfig): AliasNode {
  const root: AliasNode = {
    key: "",
    fullAlias: "",
    children: {},
  };

  for (const [alias, item] of Object.entries(config)) {
    let currentNode = root;

    for (let i = 0; i < alias.length; i++) {
      const char = alias[i];
      const fullAlias = alias.substring(0, i + 1);

      if (!currentNode.children[char]) {
        currentNode.children[char] = {
          key: char,
          fullAlias,
          children: {},
        };
      }

      currentNode = currentNode.children[char];

      if (i === alias.length - 1) {
        currentNode.label = item.label;
        currentNode.value = item.value;
      }
    }
  }

  return root;
}

export function getNodeAtPath(root: AliasNode, path: string): AliasNode | null {
  let currentNode = root;

  for (const char of path) {
    if (!currentNode.children[char]) {
      return null;
    }
    currentNode = currentNode.children[char];
  }

  return currentNode;
}

export function isLeafNode(node: AliasNode): boolean {
  return node.value !== undefined;
}

export function isPrefixNode(node: AliasNode): boolean {
  return Object.keys(node.children).length > 0;
}
