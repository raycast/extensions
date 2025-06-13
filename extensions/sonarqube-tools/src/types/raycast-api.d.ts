/**
 * Type definitions to fix TypeScript errors with @raycast/api
 * Consolidated from multiple definition files
 */

import "@raycast/api";

declare module "@raycast/api" {
  // Add missing properties to the Toast interface
  interface Toast {
    hide: () => void;
    show: () => void;
  }

  // Add missing properties to ToastOptions
  interface ToastOptions {
    primaryAction?: {
      title: string;
      onAction: (toast: Toast) => void | Promise<void>;
    };
  }

  // Support both function signatures for showToast
  interface ShowToastFunction {
    (options: ToastOptions): Toast;
    (title: string): Toast;
  }

  // Redefine showToast with both supported signatures
  const showToast: ShowToastFunction;

  // Support both function signatures for showToast
  interface ShowToastFunction {
    (options: ToastOptions): Promise<Toast>;
    (style: Toast.Style, title: string, message?: string): Promise<Toast>;
  }

  // Redefine showToast with both supported signatures
  const showToast: ShowToastFunction;
}
