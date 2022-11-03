export interface ILayout {
  readonly title: string;
  readonly id: string;
  activate: () => Promise<void>;
}

export interface ILayoutManager {
  nextInput: () => Promise<ILayout>;
}
