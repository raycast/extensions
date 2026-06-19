export interface FileManagerProvider {
  /** Human-readable name shown in UI copy. */
  readonly name: string;
  /** macOS bundle identifier, used to match the frontmost application. */
  readonly bundleId: string;
  /** Return POSIX paths of items currently selected in this file manager. */
  getSelectedPaths(): Promise<string[]>;
}
