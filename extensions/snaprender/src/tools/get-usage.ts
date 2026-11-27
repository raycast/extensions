import { getClient } from "../lib/raycast";

/**
 * Returns the SnapRender plan, captures used and left this month, and the reset date.
 */
export default async function tool() {
  const data = await getClient().usage();
  return {
    plan: data.plan,
    capturesUsed: data.usage.screenshots_used,
    capturesLimit: data.usage.screenshots_limit,
    capturesLeft: data.usage.screenshots_remaining,
    extraCredits: data.usage.extra_credits ?? 0,
    periodStart: data.period.start,
    resetsAt: data.period.end,
  };
}
