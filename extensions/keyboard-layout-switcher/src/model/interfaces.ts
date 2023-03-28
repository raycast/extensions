export interface ILayout {
  readonly title: string;
  readonly id: string;
  readonly active: boolean;
  activate: () => Promise<void>;
}

export interface ILayoutManager {
  getAll: () => Promise<ILayout[]>;
  setNextInput: () => Promise<ILayout>;
  activeInput?: string;
}
