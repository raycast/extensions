import { getQuota } from "../lib/api";

function toIsoTime(timestamp: number): string {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp * 1000).toISOString();
}

/**
 * Check the user's current GetNote OpenAPI quota, usage limits, remaining calls, and reset times.
 */
export default async function getQuotaTool() {
  const quota = await getQuota();

  return {
    read: {
      daily: {
        ...quota.read.daily,
        resetAt: toIsoTime(quota.read.daily.reset_at),
      },
      monthly: {
        ...quota.read.monthly,
        resetAt: toIsoTime(quota.read.monthly.reset_at),
      },
    },
    write: {
      daily: {
        ...quota.write.daily,
        resetAt: toIsoTime(quota.write.daily.reset_at),
      },
      monthly: {
        ...quota.write.monthly,
        resetAt: toIsoTime(quota.write.monthly.reset_at),
      },
    },
    writeNote: {
      daily: {
        ...quota.write_note.daily,
        resetAt: toIsoTime(quota.write_note.daily.reset_at),
      },
      monthly: {
        ...quota.write_note.monthly,
        resetAt: toIsoTime(quota.write_note.monthly.reset_at),
      },
    },
  };
}
