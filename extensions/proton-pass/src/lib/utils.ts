import { Icon } from "@raycast/api";
import { Item, ItemType } from "./types";

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
