export type Note = {
  title: string;
  content: string;
  saidBy: string;
  tags: string;
};

export type Preferences = {
  PUBLIC_API_TOKEN: string;
  TAGS_DEFAULT?: string;
  USER_EMAIL?: string;
};
