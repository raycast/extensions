// What the well-known macOS background services are, so a row like "nsurlsessiond" explains itself.
export const SERVICES: Record<string, string> = {
  nsurlsessiond: "Background downloads and uploads on behalf of apps (iCloud, App Store, updates)",
  cloudd: "iCloud (CloudKit) sync",
  bird: "iCloud Drive sync",
  photolibraryd: "Photos library / iCloud Photos",
  cloudphotod: "iCloud Photos sync",
  mediaanalysisd: "Background photo analysis (faces, objects)",
  softwareupdated: "macOS software updates",
  mobileassetd: "System assets (languages, fonts, Siri) downloads",
  backupd: "Time Machine backups",
  apsd: "Apple push notifications (small and normal)",
  trustd: "Certificate checks (small and normal)",
  mDNSResponder: "Local network and DNS lookups (small and normal)",
};

export const TC_LABEL: Record<string, string> = {
  BK_SYS: "background (system)",
  BK: "background",
  BE: "normal",
  RD: "bulk",
  VI: "video",
  VO: "voice",
  CTL: "control",
};

// Where to turn a known background service down (each URL was opened and checked on macOS 27).
const ICLOUD = {
  title: "Open Apple Account / iCloud Settings",
  url: "x-apple.systempreferences:com.apple.systempreferences.AppleIDSettings",
};
const UPDATE = {
  title: "Open Software Update Settings",
  url: "x-apple.systempreferences:com.apple.Software-Update-Settings.extension",
};
export const SETTINGS: Record<string, { title: string; url: string }> = {
  nsurlsessiond: ICLOUD,
  cloudd: ICLOUD,
  bird: ICLOUD,
  photolibraryd: ICLOUD,
  cloudphotod: ICLOUD,
  softwareupdated: UPDATE,
  mobileassetd: UPDATE,
  backupd: {
    title: "Open Time Machine Settings",
    url: "x-apple.systempreferences:com.apple.Time-Machine-Settings.extension",
  },
};
export const LOW_DATA = {
  title: "Open Wi-Fi Settings (Low Data Mode)",
  url: "x-apple.systempreferences:com.apple.wifi-settings-extension",
};
