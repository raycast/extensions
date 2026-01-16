import { DeviceKind, Prefs } from "./types";

export type Language = "tr" | "en";

type Strings = {
  deviceChecking: string;
  open: string;
  close: string;
  opening: string;
  closing: string;
  openingNow: string;
  closingNow: string;
  opened: string;
  closed: string;
  lightOpened: string;
  lightClosed: string;
  failed: string;
  toggle: string;
  statusChanging: string;
  colorChange: string;
  colorChanging: string;
  colorSet: (hue: number, sat: number) => string;
  color: string;
  customColor: string;
  hueLabel: string;
  satLabel: string;
  plugTitle: string;
  lightTitle: string;
  unknownIp: string;
  noCache: string;
  on: string;
  off: string;
  errorPrefix: string;
  refresh: string;
  clearCache: string;
  cacheCleared: string;
  deviceNotFound: (kind: DeviceKind) => string;
  colors: {
    red: string;
    green: string;
    blue: string;
    purple: string;
    orange: string;
    yellow: string;
    white: string;
  };
};

const STRINGS: Record<Language, Strings> = {
  tr: {
    deviceChecking: "Cihaz kontrol ediliyor...",
    open: "Ac",
    close: "Kapat",
    opening: "Aciliyor...",
    closing: "Kapaniyor...",
    openingNow: "Aciyorum...",
    closingNow: "Kapatiyorum...",
    opened: "Acildi",
    closed: "Kapandi",
    lightOpened: "Isik acildi",
    lightClosed: "Isik kapandi",
    failed: "Basarisiz",
    toggle: "Ac/Kapat",
    statusChanging: "Durum degistiriliyor...",
    colorChange: "Renk Degistir",
    colorChanging: "Renk ayarlaniyor...",
    colorSet: (hue: number, sat: number) => `Renk ayarlandi (H:${Math.round(hue)} S:${Math.round(sat)})`,
    color: "Renk",
    customColor: "Ozel (Hue/Sat)",
    hueLabel: "Hue (0-360)",
    satLabel: "Saturation (0-100)",
    plugTitle: "Priz (P110)",
    lightTitle: "Isik (L530)",
    unknownIp: "bilinmiyor",
    noCache: "cache-yok",
    on: "Acik",
    off: "Kapali",
    errorPrefix: "Hata",
    refresh: "Yenile",
    clearCache: "Cache Temizle",
    cacheCleared: "Cache temizlendi",
    deviceNotFound: (kind: DeviceKind) =>
      `${kind} cihaz bulunamadi. Ag taramasi basarisiz. Subnet veya manuel IP ayarini kontrol et.`,
    colors: {
      red: "Kirmizi",
      green: "Yesil",
      blue: "Mavi",
      purple: "Mor",
      orange: "Turuncu",
      yellow: "Sari",
      white: "Beyaz (Dusuk sat)",
    },
  },
  en: {
    deviceChecking: "Checking device...",
    open: "On",
    close: "Off",
    opening: "Turning on...",
    closing: "Turning off...",
    openingNow: "Turning on...",
    closingNow: "Turning off...",
    opened: "Turned on",
    closed: "Turned off",
    lightOpened: "Light is on",
    lightClosed: "Light is off",
    failed: "Failed",
    toggle: "Toggle",
    statusChanging: "Toggling...",
    colorChange: "Change Color",
    colorChanging: "Setting color...",
    colorSet: (hue: number, sat: number) => `Color set (H:${Math.round(hue)} S:${Math.round(sat)})`,
    color: "Color",
    customColor: "Custom (Hue/Sat)",
    hueLabel: "Hue (0-360)",
    satLabel: "Saturation (0-100)",
    plugTitle: "Plug (P110)",
    lightTitle: "Light (L530)",
    unknownIp: "unknown",
    noCache: "no-cache",
    on: "On",
    off: "Off",
    errorPrefix: "Error",
    refresh: "Refresh",
    clearCache: "Clear Cache",
    cacheCleared: "Cache cleared",
    deviceNotFound: (kind: DeviceKind) =>
      `${kind} device not found. Network scan failed. Check subnet or manual IP.`,
    colors: {
      red: "Red",
      green: "Green",
      blue: "Blue",
      purple: "Purple",
      orange: "Orange",
      yellow: "Yellow",
      white: "White (Low sat)",
    },
  },
};

export function getLanguage(prefs: Prefs): Language {
  return prefs.language === "en" ? "en" : "tr";
}

export function getStrings(prefs: Prefs): Strings {
  return STRINGS[getLanguage(prefs)];
}
