export type SearchResult = [
  {
    result: {
      data: {
        json: {
          bookmarks: Bookmark[];
        };
      };
    };
  },
];

export type Bookmark = {
  id: number;
  content: {
    type: string;
    url: string;
    title: string;
  };
};
