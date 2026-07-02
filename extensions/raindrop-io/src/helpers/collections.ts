import { Collection, CollectionItem, CollectionsResponse, Group, UserResponse } from "../types";

type CollectionNode = Collection & { children: CollectionNode[] };
type OrderedRoot = { collection: CollectionNode; groupTitle?: string };

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

function buildOrderedRoots(roots: CollectionNode[], groups: Group[] = []): OrderedRoot[] {
  if (groups.length === 0) {
    return roots.map((collection) => ({ collection }));
  }

  const rootMap = new Map<number, CollectionNode>(roots.map((root) => [root._id, root] as const));
  const seen = new Set<number>();
  const orderedRoots: OrderedRoot[] = [];
  const includeGroupTitle = groups.length > 1;

  for (const group of groups) {
    for (const collectionId of group.collections ?? []) {
      const collection = rootMap.get(collectionId);

      if (!collection || seen.has(collectionId)) {
        continue;
      }

      seen.add(collectionId);
      orderedRoots.push({
        collection,
        groupTitle: includeGroupTitle ? group.title : undefined,
      });
    }
  }

  for (const root of roots) {
    if (!seen.has(root._id)) {
      orderedRoots.push({ collection: root });
    }
  }

  return orderedRoots;
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

function flattenCollections(orderedRoots: OrderedRoot[]): CollectionItem[] {
  return orderedRoots.flatMap(({ collection, groupTitle }) => {
    const prefix = groupTitle ? `${groupTitle} - ` : undefined;
    return flattenCollectionBranch(collection, prefix);
  });
}

function buildCollectionsOptions(collections: CollectionsResponse): CollectionItem[];
function buildCollectionsOptions(user: UserResponse, collections: CollectionsResponse): CollectionItem[];
function buildCollectionsOptions(
  userOrCollections: UserResponse | CollectionsResponse,
  collectionsResponse?: CollectionsResponse,
) {
  const user = collectionsResponse ? (userOrCollections as UserResponse) : undefined;
  const collections = collectionsResponse ?? (userOrCollections as CollectionsResponse);
  const roots = normalizeCollections(collections.items);
  const orderedRoots = buildOrderedRoots(roots, user?.user.groups);

  return flattenCollections(orderedRoots);
}

export { buildCollectionsOptions };
