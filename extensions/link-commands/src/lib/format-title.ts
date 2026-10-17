import { brandFor, domainOf, routerAppOf } from "./generate-script";

export type FormatTitleInput = {
  /** What the person typed, or the suggestion when the field is empty. */
  name: string;
  target: string;
  enabled: boolean;
  /**
   * The brand the suggestion was built from. When the name is just the brand there is nothing to
   * qualify, so the title is the host alone rather than `host · brand`.
   */
  brand?: string;
  /** The Desktop App choice. A surface router may land in an app, so it keeps the bare name. */
  desktopApplication?: string;
};

/**
 * Prefixes a bare name with its site — `Usage` on `https://claude.ai/` becomes `claude.ai · Usage`,
 * while an empty name or one that is only the brand becomes the host alone (`reddit.com`). Web
 * targets only: anything without an http(s) host, and any surface router, keeps the bare name, as
 * does everything when the preference is off. Already-prefixed names are left alone.
 */
export const formatTitle = ({ name, target, enabled, brand, desktopApplication }: FormatTitleInput) => {
  const trimmedName = name.trim();
  const trimmedTarget = target.trim();
  if (!enabled) return trimmedName;

  const host = domainOf(trimmedTarget);
  if (!host) return trimmedName;
  if (routerAppOf({ title: trimmedName, target: trimmedTarget, desktopApplication })) return trimmedName;
  if (!trimmedName) return host;

  const nameLower = trimmedName.toLowerCase();
  const hostLower = host.toLowerCase();
  if (nameLower === hostLower) return host;
  if (nameLower.startsWith(`${hostLower} · `)) return trimmedName;
  if (brand?.trim() && nameLower === brand.trim().toLowerCase()) return host;
  if (!brand && brandFor(trimmedTarget)?.toLowerCase() === nameLower) return host;

  return `${host} · ${trimmedName}`;
};
