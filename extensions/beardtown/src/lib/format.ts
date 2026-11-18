import { Color, type Image } from "@raycast/api";
import { FAILED_STATUS_ICON, SUCCEEDED_STATUS_ICON } from "../config";
import type { ApiRecord } from "../types";
import { getChallengeFieldValue } from "./records";

export function formatStatusValue(value: string): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "succeeded") {
    return "Succeeded";
  }
  if (normalized === "failed") {
    return "Failed";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getStatusColor(status: string): Color | undefined {
  const normalized = status.trim().toLowerCase();
  if (normalized === "succeeded") {
    return Color.Green;
  }
  if (normalized === "failed") {
    return Color.Red;
  }
  return undefined;
}

export function getStatusIcon(status: string): Image.ImageLike | undefined {
  const normalized = status.trim().toLowerCase();
  if (normalized === "succeeded") {
    return SUCCEEDED_STATUS_ICON;
  }
  if (normalized === "failed") {
    return FAILED_STATUS_ICON;
  }
  return undefined;
}

export function formatLongDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getPriceLabel(record: ApiRecord): string {
  const priceRaw = getChallengeFieldValue(record, ["price"], "");
  if (!priceRaw) {
    return "";
  }

  const priceNumber = Number(priceRaw);
  if (Number.isNaN(priceNumber)) {
    return priceRaw;
  }

  const currency = getChallengeFieldValue(record, ["currency"], "").toUpperCase();
  if (currency === "USD") {
    return `${formatCurrency(priceNumber, "en-US", "USD")} USD`;
  }
  if (currency === "GBP") {
    return `${formatCurrency(priceNumber, "en-GB", "GBP")} GBP`;
  }
  if (currency === "EUR") {
    return `${formatCurrency(priceNumber, "en-IE", "EUR")} EUR`;
  }
  if (currency === "CAD") {
    return `${formatCurrency(priceNumber, "en-CA", "CAD")} CAD`;
  }

  return currency ? `${priceNumber} ${currency}` : String(priceNumber);
}

export function formatCurrency(priceNumber: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(priceNumber) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceNumber);
}

export function getWeightLabel(record: ApiRecord): string {
  const weightRaw = getChallengeFieldValue(record, ["weight"], "");
  return weightRaw ? `${weightRaw} lb` : "";
}

export function formatTimeUsedValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
