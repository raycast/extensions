export type SearchResults = [string, Result[]][];

type Result = {
  url: string;
  anchor: string;
  body: string;
  objectID: string;
  hierarchy: {
    [key: string]: string;
  };
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
