export type Link = {
  id: string;
  title: string;
  sectionTitle?: string;
  url: {
    path: string;
    markdown: string;
    external: boolean;
  };
};
