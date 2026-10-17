export type ReferenceId = string;

export interface ReferenceIndexItem {
  id: ReferenceId;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  topSnippet?: string;
  headings: string[];
  path: string;
  link: string;
}

export interface DatasetMeta {
  source: string;
  generatedAt: string;
  total: number;
  version?: string;
}

export interface Dataset {
  meta: DatasetMeta;
  index: ReferenceIndexItem[];
  content: Record<ReferenceId, string>;
}

export interface Frontmatter {
  title?: string;
  tags?: unknown;
  categories?: unknown;
  intro?: string;
  date?: string;
}
