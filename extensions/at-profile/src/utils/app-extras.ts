import type { App } from "../types";

/** The optional fields an app can carry besides its name and URL */
export type AppExtras = Pick<App, "platform" | "nsfw" | "handleDomain">;

/**
 * Only the extras that are set, so stored and exported apps don't carry empty keys
 */
export function appExtras({ platform, nsfw, handleDomain }: AppExtras): AppExtras {
  return {
    ...(platform ? { platform } : {}),
    ...(nsfw ? { nsfw: true } : {}),
    ...(handleDomain ? { handleDomain } : {}),
  };
}
