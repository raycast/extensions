/**
 * Type declarations for the mocked @raycast/api module
 * This makes TypeScript happy when tests import from @raycast/api
 */

declare module "@raycast/api" {
  // Toast API
  export const Toast: {
    Style: {
      Success: string;
      Failure: string;
      Animated: string;
    };
  };

  export function showToast(props: { style?: string; title?: string; message?: string }): {
    style: string;
    title: string;
    message: string;
  };

  // Preferences API
  export function getPreferenceValues<T = any /* eslint-disable-line @typescript-eslint/no-explicit-any */>(): T;
  export function openExtensionPreferences(): Promise<void>;

  // Navigation API
  export function open(target: string): Promise<void>;
  export function useNavigation(): {
    push: (component: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => void;
  };

  // UI Components
  export const List: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
  export const ActionPanel: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
  export const Action: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
  export const Icon: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
  export const Form: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
  export const Keyboard: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;

  // Utilities
  export function confirmAlert(
    options: any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
  ): Promise<boolean>;
  export const LocalStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    allItems(): Promise<Record<string, string>>;
  };

  // Test utilities (not in real Raycast API, but added for testing)
  export function _getMockToast(): {
    style: string | null;
    title: string | null;
    message: string | null;
  };
}
