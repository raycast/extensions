export type Presence = "keep" | "auto" | "away";
export type Notifications = "keep" | "pause" | "resume";
export type Duration = "30" | "60" | "120" | "today" | "never" | "custom" | "until";

export interface Preset {
  id: string;
  name: string;
  text: string;
  emoji: string;
  duration: Duration;
  customMinutes: string;
  presence: Presence;
  notifications: Notifications;
}

export interface Account {
  id: string;
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  providerId: string;
  clientId: string;
  state: "connecting" | "ready" | "disconnecting";
}

export type StoredAccount = Omit<Account, "state"> & { state?: Account["state"] };

export interface StatusRequest {
  profile: { status_text: string; status_emoji: string; status_expiration: number };
  presence: Presence;
  notifications: Notifications;
}

export type StatusChange = StatusRequest | { profile?: never; presence: "auto" | "away"; notifications: "keep" };

export interface PresencePreset {
  id: "active" | "away";
  name: string;
  description: string;
  presence: "auto" | "away";
}

export const presencePresets: PresencePreset[] = [
  { id: "active", name: "Active", description: "Let Slack set your presence automatically", presence: "auto" },
  { id: "away", name: "Away", description: "Set Away until you change it", presence: "away" },
];

export const statusEmojis = [
  { shortcode: ":dart:", emoji: "🎯", name: "Target" },
  { shortcode: ":headphones:", emoji: "🎧", name: "Headphones" },
  { shortcode: ":bus:", emoji: "🚌", name: "Bus" },
  { shortcode: ":no_entry:", emoji: "⛔", name: "No Entry" },
  { shortcode: ":calendar:", emoji: "📆", name: "Calendar" },
  { shortcode: ":green_salad:", emoji: "🥗", name: "Salad" },
  { shortcode: ":sandwich:", emoji: "🥪", name: "Sandwich" },
  { shortcode: ":coffee:", emoji: "☕", name: "Coffee" },
  { shortcode: ":house:", emoji: "🏠", name: "Home" },
  { shortcode: ":speech_balloon:", emoji: "💬", name: "Speech Bubble" },
  { shortcode: ":palm_tree:", emoji: "🌴", name: "Vacation" },
  { shortcode: ":+1:", emoji: "👍", name: "Thumbs Up" },
];

export function statusEmojiIcon(shortcode: string): string | undefined {
  return statusEmojis.find((item) => item.shortcode === shortcode.trim().toLowerCase())?.emoji;
}

export const defaultPresets: Preset[] = [
  {
    id: "focused",
    name: "Focused",
    text: "Focusing",
    emoji: ":dart:",
    duration: "60",
    customMinutes: "60",
    presence: "keep",
    notifications: "pause",
  },
  {
    id: "meeting",
    name: "In a Meeting",
    text: "In a meeting",
    emoji: ":headphones:",
    duration: "30",
    customMinutes: "30",
    presence: "keep",
    notifications: "pause",
  },
  {
    id: "commuting",
    name: "Commuting",
    text: "Commuting",
    emoji: ":bus:",
    duration: "30",
    customMinutes: "30",
    presence: "keep",
    notifications: "pause",
  },
  {
    id: "lunch",
    name: "At Lunch",
    text: "At lunch",
    emoji: ":green_salad:",
    duration: "60",
    customMinutes: "60",
    presence: "away",
    notifications: "pause",
  },
];

export const clearStatusPreset: Preset = {
  id: "clear",
  name: "Clear Status",
  text: "",
  emoji: "",
  duration: "never",
  customMinutes: "60",
  presence: "keep",
  notifications: "keep",
};

export const customPreset: Preset = {
  id: "custom",
  name: "Custom Status",
  text: "",
  emoji: "",
  duration: "60",
  customMinutes: "60",
  presence: "keep",
  notifications: "keep",
};

export function isDuration(value: unknown): value is Duration {
  return typeof value === "string" && ["30", "60", "120", "today", "never", "custom", "until"].includes(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPreset(value: unknown): value is Preset {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.text === "string" &&
    typeof value.emoji === "string" &&
    isDuration(value.duration) &&
    typeof value.customMinutes === "string" &&
    typeof value.presence === "string" &&
    ["keep", "auto", "away"].includes(value.presence) &&
    typeof value.notifications === "string" &&
    ["keep", "pause", "resume"].includes(value.notifications)
  );
}

export function isStoredAccount(value: unknown): value is StoredAccount {
  return (
    isRecord(value) &&
    ["id", "teamId", "teamName", "userId", "userName", "providerId", "clientId"].every(
      (key) => typeof value[key] === "string" && value[key].length > 0,
    ) &&
    (value.state === undefined ||
      value.state === "connecting" ||
      value.state === "ready" ||
      value.state === "disconnecting")
  );
}

export function expirationFor(duration: Duration, customMinutes: string, until: Date | null, now: Date): number {
  if (duration === "never") return 0;
  let expires: number;
  if (duration === "today") {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    expires = midnight.getTime();
  } else if (duration === "until") {
    if (!until) throw new Error("Choose an expiration date and time.");
    expires = until.getTime();
  } else {
    const minutes = duration === "custom" ? Number(customMinutes) : Number(duration);
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 525600) {
      throw new Error("Enter a whole number of minutes between 1 and 525600.");
    }
    expires = now.getTime() + minutes * 60000;
  }
  const seconds = Math.floor(expires / 1000);
  if (!Number.isSafeInteger(seconds) || seconds <= Math.floor(now.getTime() / 1000)) {
    throw new Error("Choose an expiration time in the future.");
  }
  return seconds;
}

export function createStatusRequest(preset: Preset, until: Date | null, now = new Date()): StatusRequest {
  if ([...preset.text].length > 100) throw new Error("Slack statuses can contain up to 100 characters.");
  const emoji = preset.emoji.trim();
  if (emoji && !/^:[a-zA-Z0-9_+-]+:$/.test(emoji)) {
    throw new Error("Use an emoji shortcode, such as :headphones: or :coffee:.");
  }
  const expiration = expirationFor(preset.duration, preset.customMinutes, until, now);
  if (preset.notifications === "pause" && expiration === 0) {
    throw new Error("Choose an expiration time to pause notifications. Slack requires a finite pause.");
  }
  return {
    profile: { status_text: preset.text, status_emoji: emoji, status_expiration: expiration },
    presence: preset.presence,
    notifications: preset.notifications,
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
