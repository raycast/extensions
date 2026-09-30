export type DocList = {
  [versions: string]: {
    title: string;
    url: string;
  }[];
};

export type KeyValueHierarchy = {
  [key: string]: string;
};

type SpatieDocsHit = {
  url: string;
  hierarchy: KeyValueHierarchy;
  objectID: string;
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
    hierarchy: {
      [key: string]: {
        value: string;
        matchLevel: string;
        matchedWords: string[];
      };
    };
  };
};
