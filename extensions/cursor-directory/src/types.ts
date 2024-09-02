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

export type { Prompt, Author, Section };
