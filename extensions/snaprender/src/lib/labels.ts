import { Device, ImageFormat } from "./api";

export const DEVICE_TITLES: Record<Device | "desktop", string> = {
  desktop: "Desktop (1280 x 800)",
  macbook_pro: "MacBook Pro",
  iphone_15_pro: "iPhone 15 Pro",
  iphone_14: "iPhone 14",
  pixel_7: "Pixel 7",
  ipad_pro: "iPad Pro",
};

export const FORMAT_TITLES: Record<ImageFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
  pdf: "PDF",
};
