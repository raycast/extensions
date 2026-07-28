import { BUSINESS_ID_STATUS_LABELS, TRADE_REGISTER_STATUS_LABELS } from "../constants";
import type {
  PrhAddress,
  PrhCompany,
  PrhCompanyForm,
  PrhDescriptionEntry,
  PrhLanguageCode,
  PrhName,
  PrhRegisteredEntry,
} from "../types/prh";
import type { UiCompany } from "../types/ui";
import { formatAddress, normalizeWebsiteUrl, selectCity, toEuVatNumber } from "./format";

export type UiNameTimelineCategory = "current-legal" | "previous-legal" | "alternate";

export interface UiNameTimelineEntry {
  name: string;
  type: string;
  version: number;
  registrationDate?: string | null;
  endDate?: string | null;
  category: UiNameTimelineCategory;
}

export interface UiRegisteredEntriesGroup {
  register: string;
  activeEntries: PrhRegisteredEntry[];
  inactiveEntries: PrhRegisteredEntry[];
}

export function selectDescription(
  descriptions: PrhDescriptionEntry[] = [],
  languageOrder: PrhLanguageCode[],
): string | undefined {
  for (const languageCode of languageOrder) {
    const match = descriptions.find(
      (entry) => entry.languageCode === languageCode && (entry.description ?? "").trim().length > 0,
    );

    if (match?.description) {
      return match.description;
    }
  }

  return descriptions.find((entry) => (entry.description ?? "").trim().length > 0)?.description ?? undefined;
}

export function selectPrimaryName(names: PrhName[] = []): PrhName | undefined {
  const preferred = names.find((name) => name.type === "1" && name.version === 1 && !name.endDate);
  if (preferred) {
    return preferred;
  }

  const activeLegalName = names.find((name) => name.type === "1" && !name.endDate);
  if (activeLegalName) {
    return activeLegalName;
  }

  const anyLegalName = names.find((name) => name.type === "1");
  if (anyLegalName) {
    return anyLegalName;
  }

  return names[0];
}

export function selectPrimaryCompanyForm(forms: PrhCompanyForm[] = []): PrhCompanyForm | undefined {
  const preferred = forms.find((form) => !form.endDate && form.version === 1);
  if (preferred) {
    return preferred;
  }

  const active = forms.find((form) => !form.endDate);
  if (active) {
    return active;
  }

  return forms[0];
}

export function selectPrimaryAddress(addresses: PrhAddress[] = []): PrhAddress | undefined {
  const streetAddress = addresses.find((address) => address.type === 1);
  if (streetAddress) {
    return streetAddress;
  }

  const postalAddress = addresses.find((address) => address.type === 2);
  if (postalAddress) {
    return postalAddress;
  }

  return addresses[0];
}

export function getBusinessIdStatusLabel(code?: string): string | undefined {
  if (!code) {
    return undefined;
  }

  return BUSINESS_ID_STATUS_LABELS[code] ?? `Unknown (${code})`;
}

export function getTradeRegisterStatusLabel(code?: string): string | undefined {
  if (!code) {
    return undefined;
  }

  return TRADE_REGISTER_STATUS_LABELS[code] ?? `Unknown (${code})`;
}

export function getActiveRegisteredEntries(entries: PrhRegisteredEntry[] = []): PrhRegisteredEntry[] {
  return entries.filter((entry) => !entry.endDate);
}

export function getEntryLabel(entry: PrhRegisteredEntry, languageOrder: PrhLanguageCode[]): string {
  const description = selectDescription(entry.descriptions ?? [], languageOrder);
  if (description) {
    return description;
  }

  return `Type ${entry.type}`;
}

function normalizeName(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toTimestamp(value?: string | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function dedupeNames(names: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(name);
  }

  return unique;
}

function sortByNewestRegistrationDate(first?: string | null, second?: string | null): number {
  return toTimestamp(second) - toTimestamp(first);
}

function selectCurrentLegalName(names: PrhName[]): string | undefined {
  const currentLegalEntry = selectPrimaryName(names.filter((name) => name.type === "1"));
  return normalizeName(currentLegalEntry?.name);
}

function selectPreviousLegalNames(names: PrhName[], currentLegalName?: string): string[] {
  const sorted = [...names]
    .filter((name) => name.type === "1")
    .sort((a, b) => {
      const endDateDelta = toTimestamp(b.endDate) - toTimestamp(a.endDate);
      if (endDateDelta !== 0) {
        return endDateDelta;
      }

      const registrationDateDelta = toTimestamp(b.registrationDate) - toTimestamp(a.registrationDate);
      if (registrationDateDelta !== 0) {
        return registrationDateDelta;
      }

      return a.version - b.version;
    });

  const candidates = sorted
    .filter((name) => Boolean(name.endDate))
    .map((name) => normalizeName(name.name))
    .filter((name): name is string => Boolean(name));

  const deduped = dedupeNames(candidates);

  if (!currentLegalName) {
    return deduped;
  }

  const currentKey = currentLegalName.toLowerCase();
  return deduped.filter((name) => name.toLowerCase() !== currentKey);
}

function selectAlternateNames(names: PrhName[]): string[] {
  const sorted = [...names]
    .filter((name) => name.type !== "1")
    .sort((a, b) => {
      const endDateDelta = toTimestamp(a.endDate) - toTimestamp(b.endDate);
      if (endDateDelta !== 0) {
        return endDateDelta;
      }

      const registrationDateDelta = toTimestamp(a.registrationDate) - toTimestamp(b.registrationDate);
      if (registrationDateDelta !== 0) {
        return registrationDateDelta;
      }

      return a.version - b.version;
    });

  return dedupeNames(sorted.map((name) => normalizeName(name.name)).filter((name): name is string => Boolean(name)));
}

function buildSearchKeywords(
  businessId: string,
  displayName: string,
  currentLegalName: string | undefined,
  previousLegalNames: string[],
  alternateNames: string[],
): string[] {
  return dedupeNames([
    businessId,
    displayName,
    ...(currentLegalName ? [currentLegalName] : []),
    ...previousLegalNames,
    ...alternateNames,
  ]);
}

export function getNameTimelineEntries(names: PrhName[] = []): UiNameTimelineEntry[] {
  const currentLegalEntry = selectPrimaryName(names.filter((name) => name.type === "1"));

  const currentLegal = currentLegalEntry
    ? [
        {
          name: currentLegalEntry.name,
          type: currentLegalEntry.type,
          version: currentLegalEntry.version,
          registrationDate: currentLegalEntry.registrationDate,
          endDate: currentLegalEntry.endDate,
          category: "current-legal" as const,
        },
      ]
    : [];

  const previousLegal = names
    .filter((name) => name.type === "1" && name !== currentLegalEntry)
    .sort((a, b) => {
      const endDateDelta = toTimestamp(b.endDate) - toTimestamp(a.endDate);
      if (endDateDelta !== 0) {
        return endDateDelta;
      }

      const registrationDateDelta = sortByNewestRegistrationDate(a.registrationDate, b.registrationDate);
      if (registrationDateDelta !== 0) {
        return registrationDateDelta;
      }

      return a.version - b.version;
    })
    .map((name) => ({
      name: name.name,
      type: name.type,
      version: name.version,
      registrationDate: name.registrationDate,
      endDate: name.endDate,
      category: "previous-legal" as const,
    }));

  const alternate = names
    .filter((name) => name.type !== "1")
    .sort((a, b) => {
      const registrationDateDelta = sortByNewestRegistrationDate(a.registrationDate, b.registrationDate);
      if (registrationDateDelta !== 0) {
        return registrationDateDelta;
      }

      const endDateDelta = toTimestamp(a.endDate) - toTimestamp(b.endDate);
      if (endDateDelta !== 0) {
        return endDateDelta;
      }

      return a.version - b.version;
    })
    .map((name) => ({
      name: name.name,
      type: name.type,
      version: name.version,
      registrationDate: name.registrationDate,
      endDate: name.endDate,
      category: "alternate" as const,
    }));

  return [...currentLegal, ...previousLegal, ...alternate].filter((entry) => Boolean(normalizeName(entry.name)));
}

export function getRegisteredEntriesGroups(entries: PrhRegisteredEntry[] = []): UiRegisteredEntriesGroup[] {
  const groupsByRegister = new Map<string, UiRegisteredEntriesGroup>();

  for (const entry of entries) {
    const existing = groupsByRegister.get(entry.register) ?? {
      register: entry.register,
      activeEntries: [],
      inactiveEntries: [],
    };

    if (entry.endDate) {
      existing.inactiveEntries.push(entry);
    } else {
      existing.activeEntries.push(entry);
    }

    groupsByRegister.set(entry.register, existing);
  }

  const groups = Array.from(groupsByRegister.values());

  for (const group of groups) {
    group.activeEntries.sort((a, b) => sortByNewestRegistrationDate(a.registrationDate, b.registrationDate));
    group.inactiveEntries.sort((a, b) => {
      const endDateDelta = toTimestamp(b.endDate) - toTimestamp(a.endDate);
      if (endDateDelta !== 0) {
        return endDateDelta;
      }

      return sortByNewestRegistrationDate(a.registrationDate, b.registrationDate);
    });
  }

  return groups.sort((a, b) => {
    if (a.activeEntries.length > 0 && b.activeEntries.length === 0) {
      return -1;
    }

    if (a.activeEntries.length === 0 && b.activeEntries.length > 0) {
      return 1;
    }

    return Number(a.register) - Number(b.register);
  });
}

export function toUiCompany(company: PrhCompany, languageOrder: PrhLanguageCode[]): UiCompany {
  const names = company.names ?? [];
  const primaryName = selectPrimaryName(names);
  const primaryForm = selectPrimaryCompanyForm(company.companyForms ?? []);
  const primaryAddress = selectPrimaryAddress(company.addresses ?? []);

  const displayName = primaryName?.name?.trim() || company.businessId.value;
  const currentLegalName = selectCurrentLegalName(names);
  const previousLegalNames = selectPreviousLegalNames(names, currentLegalName);
  const alternateNames = selectAlternateNames(names);
  const companyFormLabel = primaryForm ? selectDescription(primaryForm.descriptions ?? [], languageOrder) : undefined;

  const mainBusinessLineLabel = company.mainBusinessLine
    ? selectDescription(company.mainBusinessLine.descriptions ?? [], languageOrder)
    : undefined;

  const website = normalizeWebsiteUrl(company.website?.url);
  const activeRegisterCount = getActiveRegisteredEntries(company.registeredEntries ?? []).length;

  return {
    businessId: company.businessId.value,
    euId: company.euId?.value,
    euVatNumber: toEuVatNumber(company.businessId.value),
    displayName,
    currentLegalName,
    previousLegalNames,
    alternateNames,
    previousLegalNameCount: previousLegalNames.length,
    alternateNameCount: alternateNames.length,
    searchKeywords: buildSearchKeywords(
      company.businessId.value,
      displayName,
      currentLegalName,
      previousLegalNames,
      alternateNames,
    ),
    primaryNameType: primaryName?.type,
    companyFormCode: primaryForm?.type,
    companyFormLabel,
    tradeRegisterStatusCode: company.tradeRegisterStatus,
    tradeRegisterStatusLabel: getTradeRegisterStatusLabel(company.tradeRegisterStatus),
    businessIdStatusCode: company.status,
    businessIdStatusLabel: getBusinessIdStatusLabel(company.status),
    mainBusinessLineCode: company.mainBusinessLine?.type,
    mainBusinessLineLabel,
    website,
    primaryAddress,
    addresses: company.addresses ?? [],
    registeredEntries: company.registeredEntries ?? [],
    activeRegisterCount,
    registrationDate: company.registrationDate ?? company.businessId.registrationDate ?? undefined,
    endDate: company.endDate ?? undefined,
    lastModified: company.lastModified,
    languageOrder,
    raw: company,
  };
}

export function getPrimaryCity(company: UiCompany): string | undefined {
  const preferredAddress = company.primaryAddress ?? selectPrimaryAddress(company.addresses);
  if (!preferredAddress) {
    return undefined;
  }

  return selectCity(preferredAddress.postOffices ?? [], company.languageOrder);
}

export function getPrimaryAddressText(company: UiCompany): string | undefined {
  return formatAddress(company.primaryAddress ?? selectPrimaryAddress(company.addresses), company.languageOrder);
}

export function hasCriticalDetailData(company?: UiCompany): boolean {
  if (!company) {
    return false;
  }

  const hasTradeRegisterStatus = Boolean(company.tradeRegisterStatusCode);
  const hasAddressesPayload = Array.isArray(company.raw.addresses);
  const hasRegisteredEntriesPayload = Array.isArray(company.raw.registeredEntries);

  return hasTradeRegisterStatus && hasAddressesPayload && hasRegisteredEntriesPayload;
}
