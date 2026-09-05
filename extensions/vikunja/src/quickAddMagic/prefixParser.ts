import { PREFIXES, PrefixMode } from "./prefixes";

export const getItemsFromPrefix = (text: string, prefix: string): string[] => {
  const items: string[] = [];

  const itemParts = text.split(" " + prefix);
  if (text.startsWith(prefix)) {
    const firstItem = text.split(prefix)[1];
    itemParts.unshift(firstItem);
  }

  itemParts.forEach((p, index) => {
    if (index < 1) {
      return;
    }

    if (p.startsWith(prefix)) {
      p = p.substring(1);
    }

    let itemText;
    if (p.charAt(0) === "'") {
      itemText = p.split("'")[1];
    } else if (p.charAt(0) === '"') {
      itemText = p.split('"')[1];
    } else {
      itemText = p.split(" ")[0];
    }

    if (itemText !== "") {
      items.push(itemText);
    }
  });

  return Array.from(new Set(items));
};

export const getProjectFromPrefix = (
  text: string,
  prefixMode: PrefixMode,
): string | null => {
  const projectPrefix = PREFIXES[prefixMode]?.project;
  if (typeof projectPrefix === "undefined") {
    return null;
  }
  const projects: string[] = getItemsFromPrefix(text, projectPrefix);
  return projects.length > 0 ? projects[0] : null;
};

export const getLabelsFromPrefix = (
  text: string,
  prefixMode: PrefixMode,
): string[] | null => {
  const labelsPrefix = PREFIXES[prefixMode]?.label;
  if (typeof labelsPrefix === "undefined") {
    return null;
  }
  return getItemsFromPrefix(text, labelsPrefix);
};
