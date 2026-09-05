import type { Image } from "@raycast/api";

/**
 * CeyPay's official channels, taken from the `socials` block in the docs site
 * config so they stay in step with what the docs footer links to.
 *
 * Icons are each platform's mark drawn in CeyPay blue, bundled as SVG in
 * `assets/`. Nothing is fetched at render time, so the extension stays fully
 * offline, and one shared brand colour means both Raycast themes are covered
 * without a light/dark pair per channel.
 */
export type Social = {
  name: string;
  handle: string;
  url: string;
  icon: Image.ImageLike;
};

export const SOCIALS: Social[] = [
  { name: "Telegram", handle: "@CeyPayio", url: "https://t.me/CeyPayio", icon: "social-telegram.svg" },
  { name: "X", handle: "@ceypayintern", url: "https://x.com/ceypayintern", icon: "social-x.svg" },
  {
    name: "LinkedIn",
    handle: "CeyPay",
    url: "https://www.linkedin.com/showcase/ceypay",
    icon: "social-linkedin.svg",
  },
  { name: "GitHub", handle: "CeyPay-io", url: "https://github.com/CeyPay-io", icon: "social-github.svg" },
  {
    name: "Instagram",
    handle: "@ceypay.io",
    url: "https://www.instagram.com/ceypay.io",
    icon: "social-instagram.svg",
  },
  { name: "Facebook", handle: "ceypay.io", url: "https://www.fb.com/ceypay.io", icon: "social-facebook.svg" },
  { name: "TikTok", handle: "@ceypay.io", url: "https://www.tiktok.com/@ceypay.io", icon: "social-tiktok.svg" },
];

export const CEYPAY_SITE = "https://ceypay.io";
