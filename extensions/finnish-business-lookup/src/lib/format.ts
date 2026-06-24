import type { PrhAddress, PrhLanguageCode, PrhPostOffice } from "../types/prh";
import { EIGHT_DIGIT_BUSINESS_ID_REGEX, FULL_BUSINESS_ID_REGEX } from "../constants";

export function formatDate(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function normalizeWebsiteUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function toEuVatNumber(businessId?: string): string | undefined {
  if (!businessId) {
    return undefined;
  }

  const normalized = businessId.trim();
  if (!normalized) {
    return undefined;
  }

  if (FULL_BUSINESS_ID_REGEX.test(normalized)) {
    return `FI${normalized.replace("-", "")}`;
  }

  if (EIGHT_DIGIT_BUSINESS_ID_REGEX.test(normalized)) {
    return `FI${normalized}`;
  }

  return undefined;
}

export function selectCity(
  postOffices: PrhPostOffice[] = [],
  languageOrder: PrhLanguageCode[] = ["3", "1", "2"],
): string | undefined {
  for (const languageCode of languageOrder) {
    const match = postOffices.find((entry) => entry.languageCode === languageCode && entry.city?.trim().length > 0);
    if (match) {
      return match.city;
    }
  }

  return postOffices.find((entry) => entry.city?.trim().length > 0)?.city;
}

export function formatAddress(
  address?: PrhAddress,
  languageOrder: PrhLanguageCode[] = ["3", "1", "2"],
): string | undefined {
  if (!address) {
    return undefined;
  }

  const line1Parts: string[] = [];
  if (address.street?.trim()) {
    line1Parts.push(address.street.trim());
  }
  if (address.buildingNumber?.trim()) {
    line1Parts.push(address.buildingNumber.trim());
  }
  if (address.entrance?.trim()) {
    line1Parts.push(address.entrance.trim());
  }
  if (address.apartmentNumber?.trim()) {
    const suffix = address.apartmentIdSuffix?.trim() ?? "";
    line1Parts.push(`${address.apartmentNumber.trim()}${suffix}`);
  }

  const line2Parts: string[] = [];
  if (address.postCode?.trim()) {
    line2Parts.push(address.postCode.trim());
  }

  const city = selectCity(address.postOffices ?? [], languageOrder);
  if (city) {
    line2Parts.push(city);
  }

  if (!line1Parts.length && !line2Parts.length && address.freeAddressLine?.trim()) {
    return address.freeAddressLine.trim();
  }

  const chunks: string[] = [];
  if (line1Parts.length) {
    chunks.push(line1Parts.join(" "));
  }
  if (line2Parts.length) {
    chunks.push(line2Parts.join(" "));
  }
  if (address.co?.trim()) {
    chunks.push(`c/o ${address.co.trim()}`);
  }

  return chunks.join(", ") || undefined;
}
