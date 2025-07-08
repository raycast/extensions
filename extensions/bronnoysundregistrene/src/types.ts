export interface Company {
  name: string;
  organizationNumber: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
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
  ceo?: string;
  description?: string;
  bregUrl: string;
  companyId?: string;
  location?: string;
  accountingYear?: string;
  isAudited?: boolean;
}

export interface SearchResult {
  companies: Company[];
  hasMore: boolean;
}
