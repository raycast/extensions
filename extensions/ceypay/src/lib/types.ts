export type DocPage = {
  title: string;
  description: string;
  slug: string;
  url: string;
  tab: string;
  group: string;
};

export type EndpointParameter = {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description: string;
};

export type EndpointResponse = {
  status: string;
  description: string;
  example?: unknown;
};

export type Endpoint = {
  method: string;
  path: string;
  operationId: string;
  title: string;
  summary: string;
  description: string;
  tag: string;
  group: string;
  url: string;
  hasCanonicalUrl: boolean;
  /**
   * Set false by the index build when the docs page is not reachable yet. The
   * endpoint still works offline; only its outbound link is withheld.
   */
  docsLive?: boolean;
  parameters: EndpointParameter[];
  requestExample?: unknown;
  requestRequired: boolean;
  responses: EndpointResponse[];
};

export type Server = { url: string; description: string };

export type SecurityHeader = { id: string; name: string; description: string };

export type DocsIndex = {
  generatedAt: string;
  baseUrl: string;
  servers: Server[];
  securityHeaders: SecurityHeader[];
  tags: { name: string; description: string }[];
  pages: DocPage[];
  endpoints: Endpoint[];
};

/** One `<Update>` block from a changelog page. */
export type ChangelogEntry = {
  id: string;
  date?: string;
  title: string;
  tags: string[];
  markdown: string;
  image?: string;
  source: string;
  url: string;
};

export type BlogTag = {
  name: string;
  slug: string;
};

/** A Ghost post, narrowed to the fields the blog command renders. */
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featureImage?: string;
  publishedAt?: string;
  readingTime?: number;
  html: string;
  tags: BlogTag[];
  authors: string[];
};
