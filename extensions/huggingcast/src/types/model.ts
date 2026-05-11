export interface Model {
  id: string;
  name: string;
  prompt: string;
  model: string;
  createdAt: string;
}

export type ModelSelection = Model | { id: "default"; name: "Default" };
