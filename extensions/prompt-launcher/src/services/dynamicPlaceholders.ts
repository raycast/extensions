import { Clipboard } from "@raycast/api";
import { randomUUID } from "crypto";

export async function expandDynamicPlaceholders(content: string): Promise<string> {
  const now = new Date();
  const clipboardText = content.includes("{clipboard}") ? await readClipboardText() : undefined;

  const expandedContent = content
    .replaceAll("{date}", formatDate(now))
    .replaceAll("{time}", formatTime(now))
    .replaceAll("{datetime}", formatDateTime(now))
    .replaceAll("{day}", formatDay(now))
    .replaceAll("{timezone}", formatTimeZone(now))
    .replaceAll("{now}", formatNow(now))
    .replaceAll("{uuid}", randomUUID().toUpperCase());

  return clipboardText === undefined ? expandedContent : expandedContent.replaceAll("{clipboard}", clipboardText);
}

async function readClipboardText(): Promise<string> {
  try {
    return (await Clipboard.readText()) ?? "";
  } catch {
    return "";
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
}

function formatNow(date: Date): string {
  return `${formatDateTime(date)} ${formatTimeZone(date)}`;
}

function formatTimeZone(date: Date): string {
  const { timeZone } = new Intl.DateTimeFormat().resolvedOptions();
  const utcOffsetTimeZone = getUtcOffsetTimeZone(date);

  return timeZone ? `${timeZone} ${utcOffsetTimeZone}` : utcOffsetTimeZone;
}

function getUtcOffsetTimeZone(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffsetMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (absoluteOffsetMinutes % 60).toString().padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
}
