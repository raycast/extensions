import { killRunningSay } from "mac-say";

/**
 * Stop the current running Say.
 */
export default async function () {
  try {
    await killRunningSay();
  } catch {
    // Handle error gracefully
  }
}
