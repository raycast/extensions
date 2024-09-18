type BaseSnippet = {
  id: string;
  text: string;
  name: string;
  keyword: string;
  hasMarkdown?: boolean;
};

type SnippetType = {
  type: "symbol" | "spelling" | "unicode" | "template";
};

type CodeType = {
  type: "code";
  language: string;
};

type Snippet = BaseSnippet & (SnippetType | CodeType);

export type SnippetCategory = {
  name: string;
  slug: string;
  icon: string;
  snippets: Snippet[];
};
