export type Recipe = {
  id: string;
  category: string;
  title: string;
};

export type Category = { name: string; ops: string[] };

export type Props = {
  recipe: string;
};
