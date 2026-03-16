import { Collection, CollectionItem, CollectionsResponse, UserResponse } from "../types";

type CollectionNode = Collection & { children: CollectionNode[] };

function normalizeCollections(collections: Collection[] = []) {
  const nodes = new Map<number, CollectionNode>();

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

function flattenCollections(collections: CollectionNode[], prefix?: string): CollectionItem[] {
  return collections.flatMap((collection) => {
    const label = prefix ? `${prefix} > ${collection.title}` : collection.title;
    const current: CollectionItem = {
      value: collection._id,
      label,
      name: collection.title,
      cover: Array.isArray(collection.cover) && collection.cover.length > 0 ? collection.cover[0] : undefined,
    };

    return [current, ...flattenCollections(collection.children, label)];
  });
}

function buildCollectionsOptions(
  userOrCollections: UserResponse | CollectionsResponse,
  collectionsResponse?: CollectionsResponse,
) {
  const collections = collectionsResponse ?? (userOrCollections as CollectionsResponse);
  const roots = normalizeCollections(collections.items);
  return flattenCollections(roots);
}

export { buildCollectionsOptions };
