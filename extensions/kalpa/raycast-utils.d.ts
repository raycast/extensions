// Local type stubs to satisfy TypeScript / ESLint for @raycast/utils
// Runtime behavior still uses the actual library implementations.

declare module "@raycast/utils" {
  // Simplified typings for useCachedPromise
  export function useCachedPromise<T = unknown, Args = unknown>(
    fn: (arg: Args) => Promise<T> | T,
    deps?: readonly unknown[],
    options?: unknown
  ): {
    data: T | undefined;
    isLoading: boolean;
    revalidate: () => Promise<void>;
  };

  // Simplified typing for runAppleScript used in quick-save.tsx
  export function runAppleScript(script: string): Promise<string>;
}
