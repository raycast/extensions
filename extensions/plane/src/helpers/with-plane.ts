import { withAccessToken } from "@raycast/utils";
import { plane, requirePlaneClient } from "../api/auth";
import { describePlaneError, getErrorStatus } from "./errors";

/**
 * Wraps an AI tool (or tool confirmation) so it runs after Plane authorization,
 * the same way no-view commands do: OAuth via `plane`, or the API key with the stored workspace slug.
 * Throws a clear error when no workspace has been chosen yet.
 */
export function withPlane<Input, Output>(fn: (input: Input) => Promise<Output>): (input: Input) => Promise<Output> {
  const wrapped = withAccessToken(plane)(async (input: Input) => {
    requirePlaneClient();
    try {
      return await fn(input);
    } catch (error) {
      if (getErrorStatus(error) !== undefined) {
        const { title, message } = describePlaneError(error);
        throw new Error(`${title}: ${message}`);
      }
      throw error;
    }
  });
  return wrapped as (input: Input) => Promise<Output>;
}
