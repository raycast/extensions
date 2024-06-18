/**
 * These types have been copied over from official dub SDK: https://d.to/sdk
 */

import { TagSchema } from "@/types";

export type LinkSchema = {
  /**
   * The unique ID of the short link.
   */
  id: string;
  /**
   * The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
   */
  domain: string;
  /**
   * The short link slug. If not provided, a random 7-character slug will be generated.
   */
  key: string;
  /**
   * This is the ID of the link in your database. If set, it can be used to identify the link in the future. Must be prefixed with 'ext_' when passed as a query parameter.
   */
  externalId: string | null;
  /**
   * The destination URL of the short link.
   */
  url: string;
  /**
   * [BETA] Whether to track conversions for the short link.
   */
  trackConversion?: boolean | undefined;
  /**
   * Whether the short link is archived.
   */
  archived?: boolean | undefined;
  /**
   * The date and time when the short link will expire in ISO-8601 format.
   */
  expiresAt: string | null;
  /**
   * The URL to redirect to when the short link has expired.
   */
  expiredUrl: string | null;
  /**
   * The password required to access the destination URL of the short link.
   */
  password: string | null;
  /**
   * Whether the short link uses Custom Social Media Cards feature.
   */
  proxy?: boolean | undefined;
  /**
   * The title of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
   */
  title: string | null;
  /**
   * The description of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
   */
  description: string | null;
  /**
   * The image of the short link generated via `api.dub.co/metatags`. Will be used for Custom Social Media Cards if `proxy` is true.
   */
  image: string | null;
  /**
   * Whether the short link uses link cloaking.
   */
  rewrite?: boolean | undefined;
  /**
   * The iOS destination URL for the short link for iOS device targeting.
   */
  ios: string | null;
  /**
   * The Android destination URL for the short link for Android device targeting.
   */
  android: string | null;
  /**
   * Geo targeting information for the short link in JSON format `{[COUNTRY]: https://example.com }`. Learn more: https://d.to/geo
   */
  geo: Record<string, string | undefined> | null;
  /**
   * Whether the short link's stats are publicly accessible.
   */
  publicStats?: boolean | undefined;
  /**
   * The tags assigned to the short link.
   */
  tags: Array<TagSchema> | null;
  /**
   * The comments for the short link.
   */
  comments: string | null;
  /**
   * The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
   */
  shortLink: string;
  /**
   * The full URL of the QR code for the short link (e.g. `https://api.dub.co/qr?url=https://dub.sh/try`).
   */
  qrCode: string;
  /**
   * The UTM source of the short link.
   */
  utmSource: string | null;
  /**
   * The UTM medium of the short link.
   */
  utmMedium: string | null;
  /**
   * The UTM campaign of the short link.
   */
  utmCampaign: string | null;
  /**
   * The UTM term of the short link.
   */
  utmTerm: string | null;
  /**
   * The UTM content of the short link.
   */
  utmContent: string | null;
  /**
   * The user ID of the creator of the short link.
   */
  userId: string;
  /**
   * The workspace ID of the short link.
   */
  workspaceId: string;
  /**
   * The number of clicks on the short link.
   */
  clicks?: number | undefined;
  /**
   * The date and time when the short link was last clicked.
   */
  lastClicked: string | null;
  /**
   * [BETA]: The number of leads the short links has generated.
   */
  leads?: number | undefined;
  /**
   * [BETA]: The number of sales the short links has generated.
   */
  sales?: number | undefined;
  /**
   * The date and time when the short link was created.
   */
  createdAt: string;
  /**
   * The date and time when the short link was last updated.
   */
  updatedAt: string;
};
