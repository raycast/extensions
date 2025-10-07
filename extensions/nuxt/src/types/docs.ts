export interface NuxtDocsNode {
  title: string;
  path: string;
  children?: NuxtDocsNode[];
}

export interface NuxtDocsLink {
  title: string;
  path: string;
}
