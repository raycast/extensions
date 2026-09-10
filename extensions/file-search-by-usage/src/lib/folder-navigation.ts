import { traceNavigation } from "./navigation-diagnostics";

export type FolderFrame = { id: number; dir?: string; selectedPath?: string };

/** Only the active location is retained; IDs reject obsolete callbacks. */
export class FolderNavigation {
  private frame: FolderFrame;

  constructor(startDir?: string) {
    this.frame = { id: 0, dir: startDir };
  }

  get current(): FolderFrame {
    return this.frame;
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
    selectedPath?: string,
  ): FolderFrame | undefined {
    if (!this.canNavigate(fromId, target)) return;
    this.frame = { id: this.current.id + 1, dir: target, selectedPath };
    traceNavigation("folder-changed", {
      frameId: this.current.id,
      nativeScreens: 1,
    });
    return this.current;
  }
}
