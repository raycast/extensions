import { execSync } from "child_process";

/**
 * Open a URL in Google Chrome.
 */
export function openUrl(url: string): void {
  execSync(`open -a "Google Chrome" "${url}"`);
}
