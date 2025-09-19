/**
 * User-related Azure DevOps operations
 */

import { runAz } from "../az-cli";

/**
 * Gets the current authenticated Azure user's email
 */
export async function getCurrentUser(): Promise<string | null> {
  try {
    const { stdout: userEmail } = await runAz([
      "account",
      "show",
      "--query",
      "user.name",
      "-o",
      "tsv",
    ]);
    return userEmail.trim();
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}
