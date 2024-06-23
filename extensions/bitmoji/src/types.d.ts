export type Emoji = {
  title: string;
  description: string;
  src: string;
  tags: string[];
  categories: string[];
};

export type Brand = {
  id: string;
  title: string;
  src: string;
};

export type Outfit = {
  brand: string;
  id: string;
  src: string;
};

export type Friend = {
  name: string;
  id: string;
};
