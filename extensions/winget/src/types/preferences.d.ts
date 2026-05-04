export {};

declare global {
  interface Preferences {
    wingetPath?: string;
    runInBackground: boolean;
    hideUnmanagedPackages: boolean;
  }
}
