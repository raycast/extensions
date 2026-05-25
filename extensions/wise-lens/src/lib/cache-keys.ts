export const DASHBOARD_CACHE_KEY = "wise:dashboard:v1";
export const PROFILE_ID_CACHE_KEY = "wise:profileId:v1";
export const RATE_LIMIT_COOLDOWN_KEY = "wise:ratelimitCooldownUntil:v1";

export function rateCacheKey(source: string, target: string): string {
  return `wise:rate:v1:${source}:${target}`;
}
