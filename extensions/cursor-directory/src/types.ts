interface Prompt {
  tags: string[];
  title: string;
  slug: string;
  libs: string[];
  content: string;
  author: Author;
  // count of how many times the prompt has been copied on cursor.directory
  // null if not available
  count: number | null;
}

type PromptWithCount = Prompt & { count: number };

type AllPromptsResponse = {
  data: Prompt[];
};

type PopularPromptsResponse = {
  data: PromptWithCount[];
};

type APIResponse = AllPromptsResponse | PopularPromptsResponse;

interface Section {
  name: string;
  slugs: string[];
}

interface Author {
  name: string;
  url: string;
  avatar: string;
}

export type { Prompt, Author, Section, PromptWithCount, AllPromptsResponse, PopularPromptsResponse, APIResponse };
