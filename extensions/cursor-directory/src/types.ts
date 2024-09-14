interface Prompt {
  tags: string[];
  title: string;
  slug: string;
  libs: string[];
  content: string;
  author: Author;
  // count of how many times the prompt has been copied on cursor.directory
  count?: number;
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
