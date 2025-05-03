export type Hook = Readonly<{
  id: string;
  title: string;
  description: string;
  content: string;
}>;

export type Page = Readonly<{
  title: string;
  description: string;
  url: string;
}>;
