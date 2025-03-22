import { environment, showToast, Toast } from "@raycast/api";

export const log: typeof console.log = environment.isDevelopment ? console.log : () => undefined;

/**
 * Show an error to the user as a toast and log it, when in debug mode.
 */
export function showError(title: string, message?: string): void {
  log(`${title} ${message}`);
  showToast(Toast.Style.Failure, title, message);
}

/**
 * Throw an error and log it, when in debug mode.
 */
export function throwError(title: string, message?: string) {
  const error = `${title} ${message}`;
  log(error);
  throw Error(error);
}
