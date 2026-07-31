import { killRunningSay } from "../speech.js";

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
