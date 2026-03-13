export type FlakeTemplate = {
  lang: string;
  content: string;
};

export type State = {
  flakeTemplates: FlakeTemplate[];
  isLoading: boolean;
};
