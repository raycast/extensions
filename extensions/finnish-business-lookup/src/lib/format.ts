import type { PrhAddress, PrhLanguageCode, PrhPostOffice } from "../types/prh";
import { EIGHT_DIGIT_BUSINESS_ID_REGEX, FULL_BUSINESS_ID_REGEX } from "../constants";

export function getStatusText(label?: string, code?: string): string {
  if (label && code) {
    return `${label} (${code})`;
  }

  if (label) {
    return label;
  }

  if (code) {
    return `Code ${code}`;
  }

  return "Not available";
}

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

export interface FormattedAddressParts {
  streetAddress?: string;
  postOfficeBox?: string;
  postalCode?: string;
  city?: string;
  careOf?: string;
  country?: string;
}

function normalizeAddressPart(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeCareOf(value?: string | null): string | undefined {
  const normalized = normalizeAddressPart(value);
  if (!normalized) {
    return undefined;
  }

  const withoutPrefix = normalized.replace(/^(?:c\/o\s*)+/i, "").trim();
  return withoutPrefix || undefined;
}

export function getFormattedAddressParts(
  address?: PrhAddress,
  languageOrder: PrhLanguageCode[] = ["3", "1", "2"],
): FormattedAddressParts | undefined {
  if (!address) {
    return undefined;
  }

  const streetParts = [
    normalizeAddressPart(address.street),
    normalizeAddressPart(address.buildingNumber),
    normalizeAddressPart(address.entrance),
  ].filter((part): part is string => Boolean(part));
  const apartmentNumber = normalizeAddressPart(address.apartmentNumber);
  const apartmentSuffix = normalizeAddressPart(address.apartmentIdSuffix) ?? "";

  if (apartmentNumber) {
    streetParts.push(`${apartmentNumber}${apartmentSuffix}`);
  }

  const parts: FormattedAddressParts = {
    streetAddress: streetParts.join(" ") || normalizeAddressPart(address.freeAddressLine),
    postOfficeBox: normalizeAddressPart(address.postOfficeBox),
    postalCode: normalizeAddressPart(address.postCode),
    city: selectCity(address.postOffices ?? [], languageOrder),
    careOf: normalizeCareOf(address.co),
    country: normalizeAddressPart(address.country),
  };

  return Object.values(parts).some(Boolean) ? parts : undefined;
}

export function formatAddress(
  address?: PrhAddress,
  languageOrder: PrhLanguageCode[] = ["3", "1", "2"],
): string | undefined {
  const parts = getFormattedAddressParts(address, languageOrder);
  if (!parts) {
    return undefined;
  }

  const chunks: string[] = [];
  if (parts.streetAddress) {
    chunks.push(parts.streetAddress);
  } else if (parts.postOfficeBox) {
    chunks.push(`P.O. Box ${parts.postOfficeBox}`);
  }

  const postalLine = [parts.postalCode, parts.city].filter(Boolean).join(" ");
  if (postalLine) {
    chunks.push(postalLine);
  }
  if (parts.careOf) {
    chunks.push(`c/o ${parts.careOf}`);
  }

  return chunks.join(", ") || undefined;
}

export function formatAddressForClipboard(
  address?: PrhAddress,
  languageOrder: PrhLanguageCode[] = ["3", "1", "2"],
): string | undefined {
  const parts = getFormattedAddressParts(address, languageOrder);
  if (!parts) {
    return undefined;
  }

  const lines = [
    parts.careOf ? `c/o ${parts.careOf}` : undefined,
    parts.streetAddress,
    parts.postOfficeBox ? `P.O. Box ${parts.postOfficeBox}` : undefined,
    [parts.postalCode, parts.city].filter(Boolean).join(" ") || undefined,
    parts.country,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n") || undefined;
}
