export type Snippet = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

export type Demo = {
  id: string;
  name: string;
  snippets: Snippet[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ActiveState = {
  demoId: string;
  index: number;
};
