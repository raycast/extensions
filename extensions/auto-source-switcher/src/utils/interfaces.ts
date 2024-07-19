export interface ILayout {
  id: string;
  title: string;
  active: boolean;
  activate(): Promise<void>;
}

export interface ILayoutManager {
  getAll(): Promise<ILayout[]>;
  setNextInput(): Promise<ILayout>;
  setLayoutByTitle(title: string): Promise<void>;
}
