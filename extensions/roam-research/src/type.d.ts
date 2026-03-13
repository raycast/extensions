export type ReversePullBlock = any & {
  ":block/_children": ReversePullBlock[];
  ":block/_refs": { ":db/id": number }[];
};
