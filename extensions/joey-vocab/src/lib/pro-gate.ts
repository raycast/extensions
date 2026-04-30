/**
 * Checks if the user has an active Joey Pro subscription.
 * Currently stubbed to always return true.
 *
 * @param _userId - User ID to check (unused in stub)
 * @returns Whether the user has Pro access
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function isProUser(userId: string): Promise<boolean> {
  // TODO: Query profiles table for subscription status when available
  return true;
}
