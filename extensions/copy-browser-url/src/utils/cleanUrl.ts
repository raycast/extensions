/**
 * Removes tracking parameters and other unwanted URL parameters
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Common tracking parameters to remove (using Set for O(1) lookup)
    const trackingParams = new Set([
      // Google Analytics & Google Ads
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "gclsrc",
      "gbraid",
      "wbraid",
      "dclid",

      // Facebook
      "fbclid",
      "fbc",
      "fbp",

      // Twitter/X
      "twclid",

      // Microsoft/Bing
      "msclkid",

      // Amazon
      "tag",
      "ref",
      "ref_",

      // General tracking
      "_ga",
      "_gl",
      "_ke",
      "mc_cid",
      "mc_eid",
      "klaviyo",
      "klatrack",
      "hsCtaTracking",
      "hsCtaTrackingId",
      "li_fat_id",

      // Social media sharing
      "igshid",
      "igsh",

      // Email tracking
      "email_source",
      "email_campaign",

      // Other common ones
      "source",
      "medium",
      "campaign",
      "content",

      // Google-specific parameters (the messy ones!)
      "rlz",
      "sourceid",
      "ie",
      "udm",
      "aep",
      "cud",
      "qsubts",
      "sei",
      "sca_esv",
      "prmd",
      "sa",
      "ved",
      "ct",
      "sxsrf",
      "ei",
      "opi",
      "gs_lcp",
      "gfe_rd",
      "gws_rd",
      "bih",
      "biw",
      "client",
      "tbm",
      "tbs",
      "safe",
      "filter",
      "nfpr",
      "num",
      "start",
      "as_qdr",
      "as_occt",
      "as_filetype",
      "as_sitesearch",
      "as_rights",
      "mtid",
      "mstk",
      "csuir",
      "zx",
      "atyp",
      "v",
      "im",
      "m",
      "pv",
      "me",
      "rt",
      "nt",
      "dt",
      "ts",
      "nhp",
      "ant",
      "pcon",
      "dt19",
      "prm23",
      "ictx",
      "no_sw_cr",
      "hl",
      "authuser",
      "continue",
      "ec",
      "passive",
      "iflsig",
      "uact",
      "oq",
      "gs_lp",
      "sclient",
      "gws-wiz",
      "gs_lcrp",

      // Bing-specific parameters
      "form",
      "sp",
      "ghc",
      "lq",
      "pq",
      "sc",
      "qs",
      "sk",
      "cvid",
      "FPIG",
      "first",
      "toWww",
      "redig",
      "ru",
      "ntb",
      "msockid",
    ]);

    // Remove tracking parameters (Set has O(1) lookup)
    for (const param of urlObj.searchParams.keys()) {
      if (trackingParams.has(param)) {
        urlObj.searchParams.delete(param);
      }
    }

    // Remove parameters that start with common tracking prefixes
    const trackingPrefixes = ["utm_", "fb_", "_", "mc_", "gs_", "gfe_", "gws_"];

    for (const key of urlObj.searchParams.keys()) {
      for (const prefix of trackingPrefixes) {
        if (key.startsWith(prefix)) {
          urlObj.searchParams.delete(key);
          break; // Exit inner loop once we find a match
        }
      }
    }

    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.error("Failed to parse URL:", error);
    return url;
  }
}
