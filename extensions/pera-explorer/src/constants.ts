export const EXPLORER_URL = "https://explorer.perawallet.app/";
export const EXPLORER_ASSETS_URL = `${EXPLORER_URL}assets/`;

export const API_BASE_URL = "https://mainnet.api.perawallet.app/";
export const API_SEARCH_URL = `${API_BASE_URL}v1/assets/search?`;
export const API_ASSET_URL = `${API_BASE_URL}v1/assets/`;

export const ASSET_LOGO_OPTS = new URLSearchParams({ w: "96", h: "96", quality: "100" });

export const VERIFICATION_TIER_ICONS = {
  verified: "https://algorand-wallet-mainnet.s3.amazonaws.com/static/images/shield-verified.svg",
  trusted: "https://algorand-wallet-mainnet.s3.amazonaws.com/static/images/shield-check.svg",
  suspicious: "https://algorand-wallet-mainnet.s3.amazonaws.com/static/images/shield-suspicious.svg",
  unverified: "",
};

export const SHARE_LINKS = [
  {
    title: "Twitter",
    url: `https://twitter.com/intent/tweet?url=${EXPLORER_ASSETS_URL}`,
  },
  {
    title: "Telegram",
    url: `https://t.me/share/url?url=${EXPLORER_ASSETS_URL}`,
  },
  {
    title: "Whatsapp",
    url: `https://wa.me/?text=${EXPLORER_ASSETS_URL}`,
  },
  {
    title: "Facebook",
    url: `https://www.facebook.com/sharer.php?u=${EXPLORER_ASSETS_URL}`,
  },
];
