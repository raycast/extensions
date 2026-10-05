import type { PrhAddress, PrhCompany, PrhLanguageCode, PrhRegisteredEntry } from "./prh";

export interface UiCompany {
  businessId: string;
  euId?: string;
  euVatNumber?: string;
  displayName: string;
  currentLegalName?: string;
  previousLegalNames: string[];
  alternateNames: string[];
  previousLegalNameCount: number;
  alternateNameCount: number;
  searchKeywords: string[];
  primaryNameType?: string;
  companyFormCode?: string;
  companyFormLabel?: string;
  tradeRegisterStatusCode?: string;
  tradeRegisterStatusLabel?: string;
  businessIdStatusCode?: string;
  businessIdStatusLabel?: string;
  mainBusinessLineCode?: string;
  mainBusinessLineLabel?: string;
  website?: string;
  primaryAddress?: PrhAddress;
  addresses: PrhAddress[];
  registeredEntries: PrhRegisteredEntry[];
  activeRegisterCount?: number;
  registrationDate?: string;
  endDate?: string;
  lastModified?: string;
  languageOrder: PrhLanguageCode[];
  raw: PrhCompany;
}

export type QueryClassificationKind = "empty" | "businessId" | "name" | "invalid-numeric" | "too-short-text";

export interface QueryClassification {
  kind: QueryClassificationKind;
  value?: string;
  normalizedBusinessId?: string;
  hint?: string;
}
