export type ResultItem = {
  id: number;
  title: string;
  url: string;
  subtype: "page" | "post";
};

export type DetailItem = {
  date: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  jetpack_featured_media_url: string;
};
