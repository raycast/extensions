interface Section {
  name: string;
  slugs: string[];
}

interface Author {
  name: string;
  url: string;
  avatar: string;
}

interface CursorRule {
  tags: string[];
  title: string;
  slug: string;
  libs: string[];
  content: string;
  author: Author;
  // count of how many times the cursor rule has been copied on cursor.directory
  // null if not available
  count: number | null;
}

type AllCursorRulesResponse = {
  data: Omit<CursorRule, "count">[];
};

type PopularCursorRulesResponse = {
  data: (Omit<CursorRule, "count"> & { count: number })[];
};

type APIResponse = AllCursorRulesResponse | PopularCursorRulesResponse;

export type { CursorRule, Author, Section, AllCursorRulesResponse, PopularCursorRulesResponse, APIResponse };
