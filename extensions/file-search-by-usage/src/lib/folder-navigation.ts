import { traceNavigation } from "./navigation-diagnostics";

export type FolderResume = { query: string; selectedPath?: string };
export type FolderFrame = FolderResume & { id: number; dir?: string };

const MAX_HISTORY = 5;

/** History contains only locations and selection, never views or callbacks. */
export class FolderNavigation {
  private frames: FolderFrame[];
  private nextId = 1;

  constructor(startDir?: string) {
    this.frames = [{ id: 0, dir: startDir, query: "" }];
  }

  get current(): FolderFrame {
    return this.frames[this.frames.length - 1];
  }

  get canGoBack(): boolean {
    return this.frames.length > 1;
  }

  isCurrent(id: number): boolean {
    return this.current.id === id;
  }

  canNavigate(fromId: number, target: string): boolean {
    return this.isCurrent(fromId) && this.current.dir !== target;
  }

  navigate(
    fromId: number,
    target: string,
    selectedPath: string | undefined,
    resume: FolderResume,
  ): FolderFrame | undefined {
    if (!this.canNavigate(fromId, target)) return;
    // Copy just these strings so a caller cannot retain a result payload here.
    this.frames[this.frames.length - 1] = {
      ...this.current,
      query: resume.query,
      selectedPath: resume.selectedPath,
    };
    const existing = this.frames.findLastIndex((frame) => frame.dir === target);
    if (existing >= 0) {
      this.frames.splice(existing + 1);
      if (selectedPath !== undefined) this.current.selectedPath = selectedPath;
    } else {
      // Back past the cap returns to the saved starting search.
      if (this.frames.length === MAX_HISTORY) this.frames.splice(1);
      this.frames.push({ id: 0, dir: target, query: "", selectedPath });
    }
    return this.activate("folder-changed");
  }

  back(fromId: number): FolderFrame | undefined {
    if (!this.isCurrent(fromId) || !this.canGoBack) return;
    this.frames.pop();
    return this.activate("folder-back");
  }

  private activate(event: string): FolderFrame {
    // Every activation invalidates callbacks from earlier result views.
    this.frames[this.frames.length - 1] = {
      ...this.current,
      id: this.nextId++,
    };
    traceNavigation(event, {
      frameId: this.current.id,
      retainedHistory: this.frames.length,
      nativeScreens: 1,
    });
    return this.current;
  }
}
