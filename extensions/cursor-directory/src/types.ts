interface Section {
  name: string;
  slugs: string[];
}

interface Author {
  name: string;
  url: string;
  avatar: string;
}

interface Video {
  title: string;
  description: string;
  url: string;
  author: {
    name: string;
    image: string;
  };
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
  isLocal: boolean;
}

interface Project {
  name: string;
  path: string;
  lastModifiedTime: number;
}

type AllCursorRulesResponse = {
  data: Omit<CursorRule, "count">[];
};

type PopularCursorRulesResponse = {
  data: (Omit<CursorRule, "count"> & { count: number })[];
};

type APIResponse = AllCursorRulesResponse | PopularCursorRulesResponse;

export type {
  Project,
  CursorRule,
  Author,
  Section,
  AllCursorRulesResponse,
  PopularCursorRulesResponse,
  APIResponse,
  Video,
};
