import type { SonarrInstanceId } from "@/lib/types/instance";

/**
 * Optional preferences are typed as possibly `undefined` on purpose: Raycast
 * hands back `undefined` (not an empty string) for an optional field that was
 * never filled in, so reading them must always go through `readPreference()`
 * in `@/lib/utils/connection`.
 */
export interface SonarrPreferences {
  instanceName?: string;
  host: string;
  port: string;
  base?: string;
  http: "http" | "https";
  apiKey: string;
  enableSecondaryInstance?: boolean;
  secondaryInstanceName?: string;
  secondaryHost?: string;
  secondaryPort?: string;
  secondaryBase?: string;
  secondaryHttp?: "http" | "https";
  secondaryApiKey?: string;
  activeInstance?: SonarrInstanceId;
  futureDays?: string;
}
