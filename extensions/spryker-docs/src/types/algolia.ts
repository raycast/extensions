type QueryItem = {
  indexName: string;
  query: string;
  params: {
    hitsPerPage: number;
    distinct: boolean;
  };
};

export type Query = QueryItem[];

export type Hit = {
  url: string;
  objectID: string;
  title: string;
  content: string;
  slug: string;
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
  };
};

export type ResultItem = {
  hits: Hit[];
  query: string;
  index: string;
};
