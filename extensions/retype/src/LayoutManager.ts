import {
  getCurrentLayout,
  getEnabledLayouts,
  selectLayout,
} from "swift:../swift";

interface ILayout {
  readonly title: string;
  readonly id: string;
  readonly active: boolean;
  activate: () => Promise<void>;
}

interface ILayoutManager {
  getAll: () => Promise<ILayout[]>;
  setInput: (input: string) => Promise<string | null>;
  setNextInput: () => Promise<ILayout>;
  getNextInput: () => Promise<ILayout>;
  getPrevInput: () => Promise<ILayout>;
  activeInput?: string;
}

export const LayoutManager: ILayoutManager = class Layout implements ILayout {
  static activeInput?: string;

  private constructor(
    readonly id: string,
    readonly title: string,
  ) {}

  get active(): boolean {
    return this.title === LayoutManager.activeInput;
  }

  public async activate(): Promise<void> {
    const status = await selectLayout(this.title);
    if (status !== "found") {
      throw new Error(`Layout "${this.title}" Not Found`);
    }
  }

  static async getAll() {
    const layouts = await getEnabledLayouts();

    LayoutManager.activeInput = await getCurrentLayout();

    const sources: Array<ILayout> = layouts.map(
      (layout) => new Layout(layout.id, layout.title),
    );

    return sources.sort((a, b) => a.title.localeCompare(b.title));
  }

  static async getNextInput() {
    const allLayouts = await LayoutManager.getAll();

    let next: ILayout = allLayouts[0];
    for (let i = 0; i < allLayouts.length; i++) {
      if (allLayouts[i].active) {
        next = i + 1 < allLayouts.length ? allLayouts[i + 1] : next;
        break;
      }
    }

    return next;
  }

  static async getPrevInput() {
    const allLayouts = await LayoutManager.getAll();

    let prev: ILayout = allLayouts[0];
    for (let i = 0; i < allLayouts.length; i++) {
      if (allLayouts[i].active) {
        prev = i - 1 >= 0 ? allLayouts[i - 1] : prev;
        break;
      }
    }

    return prev;
  }

  static async setInput(title: string) {
    const status = await selectLayout(title);
    if (status !== "found") {
      return null;
    }
    return title;
  }

  static async setNextInput() {
    const next = await LayoutManager.getNextInput();
    await next.activate();
    return next;
  }
};
