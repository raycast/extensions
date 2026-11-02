import { Color, Icon, Image } from "@raycast/api";
import { Item, ItemType } from "./types";

/** Green while a TOTP code has more than 10 seconds left, then yellow, and red for its last 5 seconds. */
export function totpTimerColor(remainingSeconds: number): Color {
  if (remainingSeconds > 10) return Color.Green;
  if (remainingSeconds > 5) return Color.Yellow;
  return Color.Red;
}

/**
 * The time a TOTP code has left, as one of Raycast's own progress circles: drawn like its other icons, they don't
 * flicker when they change, unlike an image redrawn every second. Five steps, from full to empty.
 */
export function totpProgressIcon(remainingSeconds: number, period: number, tintColor?: Color): Image.ImageLike {
  const left = remainingSeconds / period;
  const source =
    left > 0.875
      ? Icon.CircleProgress100
      : left > 0.625
        ? Icon.CircleProgress75
        : left > 0.375
          ? Icon.CircleProgress50
          : left > 0.125
            ? Icon.CircleProgress25
            : Icon.Circle;
  return tintColor ? { source, tintColor } : source;
}

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

export function formatTotpCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  return code;
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
