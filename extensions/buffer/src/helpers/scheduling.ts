import type { SchedulingType } from "../api/types";

/**
 * Facebook Groups and Instagram Profiles only support notification scheduling; every other
 * service except Instagram, TikTok, and YouTube only supports automatic scheduling. Resolves
 * the effective schedulingType regardless of what the (possibly stale, or simply not
 * applicable) form field value was.
 */
export function resolveSchedulingType(
  requestedSchedulingType: SchedulingType,
  service: string | undefined,
  isFacebookGroup: boolean,
  isInstagramProfile: boolean,
): SchedulingType {
  if (isFacebookGroup || isInstagramProfile) {
    return "notification";
  }

  const s = service?.toLowerCase();
  if (s && !["instagram", "tiktok", "youtube"].includes(s)) {
    return "automatic";
  }

  return requestedSchedulingType;
}
