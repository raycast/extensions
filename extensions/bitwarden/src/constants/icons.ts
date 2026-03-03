import { Icon } from "@raycast/api";

export const URI_SCHEME_ICONS: Record<string, Icon> = {
  // Web
  "http:": Icon.Globe,
  "https:": Icon.Globe,
  // Communication
  "mailto:": Icon.Envelope,
  "facetime:": Icon.Video,
  "facetime-audio:": Icon.Phone,
  "tel:": Icon.Phone,
  "sms:": Icon.Message,
  "imessage:": Icon.Message,
  "callto:": Icon.Phone,
  // Productivity & collaboration
  "slack:": Icon.SpeechBubble,
  "msteams:": Icon.SpeechBubble,
  "zoommtg:": Icon.Video,
  "zoomus:": Icon.Video,
  "webex:": Icon.Video,
  "notion:": Icon.Document,
  "obsidian:": Icon.Document,
  "bear:": Icon.Document,
  "craft:": Icon.Document,
  "logseq:": Icon.Document,
  "roamresearch:": Icon.Document,
  // Dev tools
  "vscode:": Icon.Code,
  "vscode-insiders:": Icon.Code,
  "cursor:": Icon.Code,
  "jetbrains:": Icon.Code,
  "idea:": Icon.Code,
  "x-github-client:": Icon.Code,
  "github-mac:": Icon.Code,
  "sourcetree:": Icon.Code,
  "fork:": Icon.Code,
  "tower:": Icon.Code,
  "ssh:": Icon.Terminal,
  "sftp:": Icon.Terminal,
  "telnet:": Icon.Terminal,
  // Files & storage
  "ftp:": Icon.Folder,
  "file:": Icon.Folder,
  "smb:": Icon.Folder,
  "afp:": Icon.Folder,
  "dropbox:": Icon.Cloud,
  "gdrive:": Icon.Cloud,
  "onedrive:": Icon.Cloud,
  "icloud:": Icon.Cloud,
  // Browsers
  "googlechrome:": Icon.Globe,
  "firefox:": Icon.Globe,
  "safari:": Icon.Globe,
  "opera:": Icon.Globe,
  "brave:": Icon.Globe,
  "arc:": Icon.Globe,
  // Mobile
  "androidapp:": Icon.Mobile,
  "intent:": Icon.Mobile,
  "market:": Icon.Store,
  // Security / auth
  "otpauth:": Icon.Key,
  "yubikey:": Icon.Key,
  "x-callback-url:": Icon.ArrowRight,
  // Maps & location
  "maps:": Icon.Map,
  "comgooglemaps:": Icon.Map,
  "geo:": Icon.Pin,
  // Music & media
  "spotify:": Icon.Music,
  "music:": Icon.Music,
  "podcast:": Icon.Microphone,
  "vlc:": Icon.Play,
  "plex:": Icon.Play,
  "infuse:": Icon.Play,
  // Password managers / secrets
  "bitwarden:": Icon.Lock,
  "onepassword:": Icon.Lock,
  "onepassword7:": Icon.Lock,
  // Finance
  "venmo:": Icon.Wallet,
  "cashapp:": Icon.Wallet,
  // Misc utilities
  "raycast:": Icon.RaycastLogoNeg,
  "x-apple-reminder:": Icon.BulletPoints,
  "x-apple-notes:": Icon.Pencil,
  "calshow:": Icon.Calendar,
  "shortcuts:": Icon.Bolt,
};
