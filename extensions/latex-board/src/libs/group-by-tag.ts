import { ColorValue, EquationObj } from "./use-equation";

export const getUniqueTags = (items: EquationObj[]): ColorValue[] => {
  const tagSet = new Set<ColorValue>();

  items.forEach((item) => {
    item.tags.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet);
};
