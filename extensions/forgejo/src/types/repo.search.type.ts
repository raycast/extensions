export type CommonOptionType = {
  id: string;
  name: string;
  value: string;
};

export const repoSortTypes: CommonOptionType[] = [
  { id: "1", name: "Most stars", value: "most stars" },
  { id: "2", name: "Fewest stars", value: "fewest stars" },
  { id: "3", name: "Newest", value: "newest" },
  { id: "4", name: "Oldest", value: "oldest" },
  { id: "5", name: "Recently updated", value: "recently updated" },
  { id: "6", name: "Least recently updated", value: "Least recently updated" },
];

export const userSearchTypes: CommonOptionType[] = [
  { id: "1", name: "All", value: "all" },
  { id: "2", name: "Starred", value: "star" },
];
