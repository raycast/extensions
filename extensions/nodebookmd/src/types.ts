/** A page in the title list, and a search hit. The server sends one shape for both. */
export type Hit = {
  path: string;
  title: string;
  nodeType?: string | null;
  icon?: string | null;
  summary?: string | null;
  score?: number;
};
