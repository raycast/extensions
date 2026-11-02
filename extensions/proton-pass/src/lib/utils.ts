import { Color, Icon, Image } from "@raycast/api";
import { Item, ItemType } from "./types";

/**
 * Green for the first half of a TOTP code's period, yellow for the next quarter and red for the last one: the color
 * changes with the progress circle.
 */
export function totpTimerColor(remainingSeconds: number, period = 30): Color {
  const left = remainingSeconds / period;
  if (left > 0.5) return Color.Green;
  if (left > 0.25) return Color.Yellow;
  return Color.Red;
}

/**
 * The time a TOTP code has left, as one of Raycast's own progress circles: drawn like its other icons, they don't
 * flicker when they change, unlike an image redrawn every second. Four steps, a quarter of the period each.
 */
export function totpProgressIcon(remainingSeconds: number, period: number, tintColor?: Color): Image.ImageLike {
  const source = totpCircle(remainingSeconds, period);
  return tintColor ? { source, tintColor } : source;
}

/** The progress circle for the time a TOTP code has left, by quarters of its period: full, then 3/4, 1/2 and 1/4. */
export function totpCircle(remainingSeconds: number, period: number): Icon {
  const left = remainingSeconds / period;
  return left > 0.75
    ? Icon.CircleProgress100
    : left > 0.5
      ? Icon.CircleProgress75
      : left > 0.25
        ? Icon.CircleProgress50
        : Icon.CircleProgress25;
}

/** TOTP's symbol where no countdown runs, e.g. on actions: a circle, like the countdown. */
export const TOTP_ICON = Icon.CircleProgress75;

export function getItemIcon(type: ItemType): Icon {
  switch (type) {
    case "login":
      return Icon.Person;
    case "note":
      return Icon.Document;
    case "credit_card":
      return Icon.CreditCard;
    case "identity":
      return Icon.PersonLines;
    case "alias":
      return Icon.AtSymbol;
    case "ssh_key":
      return Icon.Key;
    case "wifi":
      return Icon.Wifi;
    default:
      return Icon.Document;
  }
}

export function formatItemSubtitle(item: Item): string {
  const parts: string[] = [];

  if (item.username) {
    parts.push(item.username);
  } else if (item.email) {
    parts.push(item.email);
  }

  if (item.vaultName) {
    parts.push(`in ${item.vaultName}`);
  }

  return parts.join(" • ");
}

export function maskPassword(password: string): string {
  return "•".repeat(password.length);
}

export function getTotpRemainingSeconds(): number {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const secondsElapsed = now % timeStep;
  return timeStep - secondsElapsed;
}

/**
 * "123 456": the halves of a 6-digit code are set apart by an en space, a little less than a digit, as in Proton
 * Authenticator. Wider looked out of place in the details, where the countdown before the code must stay further away.
 */
export function formatTotpCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}\u2002${code.slice(3)}`;
  }
  return code;
}

/**
 * A code hidden by dots, as wide as the code in Get TOTP Code's tags, so that Show Codes doesn't move them. Raycast
 * spaces out every character of a tag, so there's one character per digit: a spot slightly wider than a fixed-width
 * digit, and a narrower gap between the halves to make up for it, as measured in the tags' font.
 */
export function hiddenTotpCode(code: string): string {
  if (code.length === 6) return "\u2981\u2981\u2981\u2005\u2981\u2981\u2981";
  return "\u2981".repeat(code.length);
}

export function getPasswordStrengthLabel(passwordScore: string): string {
  return passwordScore;
}

export function getPasswordStrengthIcon(passwordScore: string): Icon {
  const normalized = passwordScore.trim().toLowerCase();

  if (normalized === "strong" || normalized === "secure" || normalized === "good") {
    return Icon.CheckCircle;
  }

  if (normalized === "fair" || normalized === "average" || normalized === "moderate") {
    return Icon.ExclamationMark;
  }

  if (normalized === "weak" || normalized === "too weak" || normalized === "vulnerable") {
    return Icon.XMarkCircle;
  }

  return Icon.QuestionMark;
}
