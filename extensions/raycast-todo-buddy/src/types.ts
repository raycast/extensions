export interface Preferences {
  language: string;
}

export type Task = {
  id: string;
  text: string;
  difficulty: string;
  date: string | undefined;
  tags: string[];
  completed: boolean;
  pinned: boolean;
};

export type Tag = {
  name: string;
  id: string;
};
