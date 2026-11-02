import type { Node } from "jsonc-parser";

export type TreeItem = {
  id: string;
  label: string;
  pointer: string;
  node: Node;
  depth: number;
  container: boolean;
};

export function childrenOf(
  node: Node,
  pointer: string,
  depth: number,
): TreeItem[] {
  if (node.type !== "object" && node.type !== "array") return [];
  return (node.children ?? []).map((child, index) => {
    const property = node.type === "object";
    const key = property ? String(child.children![0].value) : String(index);
    const value = property ? child.children![1] : child;
    const path = `${pointer}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    return {
      id: String(value.offset),
      label: property ? key : `[${index}]`,
      pointer: path,
      node: value,
      depth,
      container: value.type === "object" || value.type === "array",
    };
  });
}

export function allTreeItems(root: Node): TreeItem[] {
  const initial: TreeItem = {
    id: String(root.offset),
    label: "$",
    pointer: "",
    node: root,
    depth: 0,
    container: root.type === "array" || root.type === "object",
  };
  const output: TreeItem[] = [];
  const stack = [initial];
  while (stack.length) {
    const item = stack.pop()!;
    output.push(item);
    stack.push(
      ...childrenOf(item.node, item.pointer, item.depth + 1).reverse(),
    );
  }
  return output;
}

export function visibleTreeItems(
  all: TreeItem[],
  expanded: Set<string>,
): TreeItem[] {
  const visibility = [true];
  return all.filter((item) => {
    if (item.depth === 0) {
      visibility[1] = expanded.has(item.id);
      return true;
    }
    const visible = !!visibility[item.depth];
    visibility[item.depth + 1] = visible && expanded.has(item.id);
    return visible;
  });
}
