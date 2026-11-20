export interface ILayout {
  readonly title: string;
  readonly id: string;
  readonly active: boolean;
  activate: (waitForForegroundPid?: number) => Promise<void>;
}

export interface ILayoutManager {
  getAll: () => Promise<ILayout[]>;
  setNextInput: (waitForForegroundPid?: number) => Promise<ILayout>;
  activeInput?: string;
  activeInputId?: string;
}
