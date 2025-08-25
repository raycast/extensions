import type { Image } from "@raycast/api";

export interface Company {
  name: string;
  organizationNumber: string;
  address?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  municipalityNumber?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  naceCode?: string;
  employees?: string;
  revenue?: string;
  operatingResult?: string;
  result?: string;
  equity?: string;
  totalAssets?: string;
  totalDebt?: string;
  ebitda?: string;
  depreciation?: string;
  founded?: string;
  description?: string;
  bregUrl: string;
  accountingYear?: string;
  isAudited?: boolean;
  isVatRegistered?: boolean;
  lastAccountsFromDate?: string;
  lastAccountsToDate?: string;
  financialHistory?: FinancialYear[];
}

export interface FinancialYear {
  year: number;
  revenue?: number;
  operatingResult?: number;
  result?: number;
  ebitda?: number;
}

export interface SearchResult {
  companies: Company[];
  hasMore: boolean;
}

// BRREG Enhetsregisteret entity summary used in search lists and favorites
export interface Enhet {
  organisasjonsnummer: string;
  navn: string;
  forretningsadresse?: {
    land?: string;
    landkode?: string;
    postnummer?: string;
    poststed?: string;
    adresse?: string[];
    kommune?: string;
    kommunenummer?: string;
  };
  emoji?: string;
  website?: string;
  faviconUrl?: Image.ImageLike;
}
