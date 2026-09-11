export type PrhLanguageCode = "1" | "2" | "3";
export type PrhSource = string;

export interface PrhDescriptionEntry {
  languageCode: string;
  description?: string | null;
}

export interface PrhBusinessId {
  value: string;
  registrationDate?: string | null;
  source: PrhSource;
}

export interface PrhEuId {
  value: string;
  source: PrhSource;
}

export interface PrhName {
  name: string;
  type: string;
  registrationDate?: string | null;
  endDate?: string | null;
  version: number;
  source: PrhSource;
}

export interface PrhMainBusinessLine {
  type: string;
  descriptions?: PrhDescriptionEntry[];
  typeCodeSet?: string;
  registrationDate?: string | null;
  source: PrhSource;
}

export interface PrhWebsite {
  url: string;
  registrationDate?: string | null;
  source: PrhSource;
}

export interface PrhCompanyForm {
  type: string;
  descriptions?: PrhDescriptionEntry[];
  registrationDate?: string | null;
  endDate?: string | null;
  version: number;
  source: PrhSource;
}

export interface PrhCompanySituation {
  type: string;
  registrationDate?: string | null;
  endDate?: string | null;
  source: PrhSource;
}

export interface PrhRegisteredEntry {
  type: string;
  descriptions?: PrhDescriptionEntry[];
  registrationDate?: string | null;
  endDate?: string | null;
  register: string;
  authority: string;
}

export interface PrhPostOffice {
  city: string;
  languageCode: string;
  municipalityCode?: string | null;
}

export interface PrhAddress {
  type: number;
  street?: string | null;
  postCode?: string | null;
  postOffices?: PrhPostOffice[];
  postOfficeBox?: string | null;
  buildingNumber?: string | null;
  entrance?: string | null;
  apartmentNumber?: string | null;
  apartmentIdSuffix?: string | null;
  co?: string | null;
  country?: string | null;
  freeAddressLine?: string | null;
  registrationDate?: string | null;
  source: PrhSource;
}

export interface PrhCompany {
  businessId: PrhBusinessId;
  euId?: PrhEuId;
  names?: PrhName[];
  mainBusinessLine?: PrhMainBusinessLine;
  website?: PrhWebsite;
  companyForms?: PrhCompanyForm[];
  companySituations?: PrhCompanySituation[];
  registeredEntries: PrhRegisteredEntry[];
  addresses?: PrhAddress[];
  tradeRegisterStatus: string;
  status?: string;
  registrationDate?: string | null;
  endDate?: string | null;
  lastModified?: string;
}

export interface PrhCompanyResult {
  totalResults: number;
  companies: PrhCompany[];
}

export interface PrhErrorResponse {
  timestamp: string;
  message?: string;
  code?: string;
  errorcode?: string;
}
