import { Collection, CollectionItem, CollectionsResponse, Group, UserResponse } from "../types";

const collectionsTree: Collection[] = [];
const treeFlat: CollectionItem[] = [];

function buildCollectionTree(treeObject: Collection[], sourceArray: Collection[], level: number) {
  const nodes = sourceArray.filter((item) => {
    return (level == 0 && !item.parent) || (item.parent && item.parent["$id"] == level);
  });

  for (const node of nodes) {
    const id = node._id;
    node.children = [];
    buildCollectionTree(node.children, sourceArray, id);
    treeObject.push(node);
  }
}

type OrderCollectionItem = [string | null, number];
type OrderedCollections = [string | null, number, Collection | undefined][];

function buildGroupsAndOrder(groups: Group[]) {
  const output: OrderCollectionItem[] = [];

  if (groups.length > 1) {
    groups.forEach((group) => {
      group.collections?.forEach((coll) => {
        output.push([group.title, coll]);
      });
    });
  } else {
    groups[0]?.collections?.forEach((coll) => {
      output.push([null, coll]);
    });
  }
  return output;
}

function orderCollections(tree: Collection[], orderedCollections: OrderCollectionItem[]) {
  const mappedCollections: OrderedCollections = [];
  orderedCollections.forEach((coll) => {
    const c = tree.find((el) => el._id == coll[1]);
    mappedCollections.push([...coll, c]);
  });
  return mappedCollections;
}

const flatChildCollections = (childColls: Collection[], prefix = "") => {
  for (let i = 0; i < childColls.length; i++) {
    const elem = childColls[i];
    const title = `${prefix} > ${elem.title}`;
    treeFlat.push({
      value: elem._id,
      label: title,
      name: elem.title,
      cover: Array.isArray(elem.cover) && elem.cover.length > 0 ? elem.cover[0] : undefined,
    });

    if (elem.children) {
      flatChildCollections(elem.children, title);
    }
  }
};

const flatCollections = (sortedColls: OrderedCollections) => {
  sortedColls.forEach((coll) => {
    const group = coll[0] ? `${coll[0]} - ` : "";
    const title = `${group}${coll[2]?.title}`;

    treeFlat.push({
      value: coll[2]?._id,
      label: title,
      name: coll[2]?.title,
      cover:
        Array.isArray(coll[2]?.cover) && (coll[2]?.cover as unknown as string[])?.length > 0
          ? (coll[2]?.cover as unknown as string[])[0]
          : undefined,
    });

    if (coll[2]?.children) {
      flatChildCollections(coll[2]?.children, title);
    }
  });
};

const buildCollectionsOptions = (userData: UserResponse, collections: CollectionsResponse) => {
  buildCollectionTree(collectionsTree, collections.items, 0);
  const groups = buildGroupsAndOrder(userData.user.groups);
  const orderedCollections = orderCollections(collectionsTree, groups);

  treeFlat.splice(0, treeFlat.length);
  flatCollections(orderedCollections);
  return treeFlat;
};

export { buildCollectionsOptions };
