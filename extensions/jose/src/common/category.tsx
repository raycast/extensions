export const CategoryType = (category: number) => {
  const types = ["memory", "note", "resource", "all"];
  return types[category - 1];
};
