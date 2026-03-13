export type Links = {
  url: string;
  title: string;
  domain: string;
  read: boolean;
  add_time: string;
};

export type ListItem = Links & {
  update: (url: string) => void;
  delete: (url: string) => void;
};
