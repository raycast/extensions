export type Link = {
  id: string;
  title: string;
  sectionTitle?: string;
  url: {
    path: string;
    external: boolean;
  };
};
