/**
 * Collection tree flattening, copied from raycast/extensions'
 * extensions/raindrop-io/src/helpers/collections.ts (MIT, commit 4cd99da7).
 * Only the Raindrop user/groups overload is dropped: ME has no account groups.
 */
import { Collection, CollectionItem, CollectionsResponse } from "../types";

type CollectionNode = Collection & { children: CollectionNode[] };

function normalizeCollections(collections: Collection[] = []) {
  const nodes = new Map<string, CollectionNode>();

  for (const collection of collections) {
    nodes.set(collection._id, {
      ...collection,
      children: [],
    });
  }

  const roots: CollectionNode[] = [];

  for (const node of nodes.values()) {
    const parentId = node.parent?.$id;
    const parent = parentId ? nodes.get(parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenCollectionBranch(collection: CollectionNode, prefix?: string): CollectionItem[] {
  const label = prefix ? `${prefix} > ${collection.title}` : collection.title;
  const current: CollectionItem = {
    value: collection._id,
    label,
    name: collection.title,
    cover: Array.isArray(collection.cover) && collection.cover.length > 0 ? collection.cover[0] : undefined,
  };

  const children = collection.children as CollectionNode[];
  return [current, ...children.flatMap((child) => flattenCollectionBranch(child, label))];
}

function flattenCollections(roots: CollectionNode[]): CollectionItem[] {
  return roots.flatMap((collection) => flattenCollectionBranch(collection));
}

export function buildCollectionsOptions(collections: CollectionsResponse): CollectionItem[] {
  return flattenCollections(normalizeCollections(collections.items));
}
