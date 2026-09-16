import { createCoastLink } from "../coast";

type Input = {
  /**
   * Moment to open: now, a past offset such as 20m or 2h ago, or an ISO timestamp such as 2026-09-09T14:30.
   */
  when: string;
};

/**
 * Create a read-only coast:// deep link to a moment in the local Coast timeline. Return the link for the user to open.
 */
export default async function tool(input: Input) {
  return {
    when: input.when,
    url: await createCoastLink(input.when),
  };
}
