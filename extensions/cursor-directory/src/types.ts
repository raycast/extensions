interface Prompt {
  tags: string[];
  title: string;
  slug: string;
  libs: string[];
  content: string;
  author: Author;
}

interface Section {
  name: string;
  slugs: string[];
}

interface Author {
  name: string;
  url: string;
  avatar: string;
}

interface GithubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
}

interface RuleObject {
  tags?: string[];
  title?: string;
  slug?: string;
  content?: string;
  author?: {
    name?: string;
    url?: string;
    avatar?: string;
  };
  libs?: string[];
}

export type { Prompt, Author, Section, GithubFileContent, RuleObject };
