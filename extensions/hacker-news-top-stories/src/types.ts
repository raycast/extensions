export type Story = {
  id: string;
  title: string;
  content_html: string;
  url: string;
  external_url: string;
  date_published: string;
  author: {
    name: string;
    url: string;
  };
};
export type CacheEntry = {
  timestamp: number;
  items: Story[];
};
