/**
 * Common tracking query parameters to strip from URLs
 * when no site-specific rule matches.
 *
 * Sources:
 *  - ClearURLs (https://github.com/ClearURLs/Rules)
 *  - Neat-URL / Linkumori (https://github.com/nickspaargaren/Linkumori)
 */

export const TRACKING_PARAMS: string[] = [
  // Google Analytics / UTM
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",

  // Google Ads
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",

  // Facebook / Meta
  "fbclid",
  "fb_action_ids",
  "fb_action_types",
  "fb_ref",
  "fb_source",

  // Microsoft Ads
  "msclkid",

  // TikTok
  "ttclid",

  // Twitter / X
  "twclid",

  // Reddit
  "rdt_cid",

  // Yahoo
  "yclid",

  // Mailchimp
  "mc_cid",
  "mc_eid",

  // HubSpot
  "_hsenc",
  "_hsmi",
  "__hstc",
  "__hsfp",
  "hsCtaTracking",

  // Adobe / Omniture
  "s_cid",
  "s_kwcid",

  // Marketo
  "mkt_tok",

  // Vero
  "vero_id",

  // Wicked Reports
  "wickedid",

  // Olytics
  "oly_anon_id",
  "oly_enc_id",

  // OpenStat
  "_openstat",

  // General affiliate / session tracking
  "ref",
  "referrer",
  "spm",
  "scm",
  "share_source",
  "share_medium",
  "share_plat",
  "share_tag",
  "share_session_id",
  "from",
  "isappinstalled",
  "nsukey",
  "mpshare",
  "wxfid",

  // Alibaba / Chinese e-commerce
  "aff_trace_key",
  "aff_platform",
  "aff_short_key",
  "algo_pvid",
  "algo_expid",
  "btsid",
  "ws_ab_test",
  "sku_id",
  "scene",
  "sourceType",

  // Impact / affiliate networks
  "irclickid",

  // Session / cache busters
  "PHPSESSID",
  "sid",
  "sessionid",
  "origin_landing",
];
