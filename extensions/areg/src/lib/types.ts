export type CompanySummary = {
  orgnr: string;
  name: string;
  form?: string | null;
  city?: string | null;
};

export type SearchHit = {
  kind: "company" | "person" | "industry";
  name: string;
  href: string;
  orgnr: string | null;
  form: string | null;
  city: string | null;
};

export type SearchResponse = {
  query: string;
  hits: SearchHit[];
};

export type Address = {
  adresse?: string[];
  postnummer?: string;
  poststed?: string;
  kommune?: string;
  land?: string;
};

export type CodeDescription = { kode: string; beskrivelse: string };

export type Freshness = {
  register: string;
  at: string | null;
  year: number | null;
  stale: boolean;
};

export type CompanyResponse = {
  orgnr: string;
  name: string;
  orgForm: string;
  registeredAt: string | null;
  updated?: Freshness;
  data: {
    navn: string;
    organisasjonsform?: CodeDescription;
    forretningsadresse?: Address;
    postadresse?: Address;
    beliggenhetsadresse?: Address;
    naeringskode1?: CodeDescription;
    naeringskode2?: CodeDescription;
    naeringskode3?: CodeDescription;
    antallAnsatte?: number;
    harRegistrertAntallAnsatte?: boolean;
    hjemmeside?: string;
    epostadresse?: string;
    telefon?: string;
    mobil?: string;
    stiftelsesdato?: string;
    registreringsdatoEnhetsregisteret?: string;
    kapital?: { belop?: number; valuta?: string; antallAksjer?: number; type?: string };
    aktivitet?: string[];
    vedtektsfestetFormaal?: string[];
    konkurs?: boolean;
    konkursdato?: string;
    underAvvikling?: boolean;
    underAvviklingDato?: string;
    underTvangsavviklingEllerTvangsopplosning?: boolean;
    slettedato?: string;
    erIKonsern?: boolean;
    registrertIMvaregisteret?: boolean;
    registrertIForetaksregisteret?: boolean;
    sisteInnsendteAarsregnskap?: string;
    overordnetEnhet?: string;
    historiskeNavn?: { navn: string; fraDato?: string; tilDato?: string }[];
  };
};

export type Filing = {
  year: number;
  type: string;
  currency: string;
  revenue: number | null;
  operatingResult: number | null;
  netResult: number | null;
  totalAssets: number | null;
  equity: number | null;
  liabilities: number | null;
};

export type AccountsResponse = { orgnr: string; companyName: string; accounts: Filing[] };

/** All amounts are in thousands of `currency`. */
export type FinancialYear = {
  year: number;
  period: string;
  periodStart: string | null;
  periodEnd: string | null;
  currency: string | null;
} & Record<string, number | string | null>;

export type FinancialsResponse = {
  orgnr: string;
  companyName: string;
  years: FinancialYear[];
  reportPdfs: { year: number; url: string }[];
};

export type Shareholder = {
  name: string;
  orgnr: string | null;
  birthYear: number | null;
  location: string | null;
  country: string | null;
  shareClass: string | null;
  shares: number;
  companyTotalShares: number | null;
  pct: number | null;
};

export type ShareholdersResponse = {
  orgnr: string;
  companyName: string;
  year: number | null;
  total: number;
  limit: number;
  offset: number;
  years: number[];
  shareholders: Shareholder[];
};

export type Holding = {
  companyOrgnr: string;
  companyName: string;
  shareClass: string | null;
  shares: number;
  companyTotalShares: number | null;
  pct: number | null;
};

export type HoldingsResponse = {
  orgnr: string;
  companyName: string;
  year: number | null;
  years: number[];
  holdings: Holding[];
};

export type HistoryEvent = {
  name: string;
  orgnr: string | null;
  born: number | null;
  kind: string;
  fromPct: number | null;
  toPct: number | null;
  fromShares: number | null;
  toShares: number | null;
};

export type HistoryResponse = {
  orgnr: string;
  companyName: string;
  transitions: {
    fromYear: number;
    toYear: number;
    capital: { fromTotalShares: number | null; toTotalShares: number | null; kind: string } | null;
    events: HistoryEvent[];
    omitted: number;
  }[];
};

export type RolePerson = { name: string; birthYear: number | null; dead?: boolean };
export type RoleEntity = { orgnr: string; name: string };

export type Role = {
  code: string;
  label: string;
  person?: RolePerson;
  entity?: RoleEntity;
  resigned: boolean;
};

export type RolesResponse = {
  orgnr: string;
  companyName: string;
  groups: { code: string; label: string; roles: Role[] }[];
  history: {
    code: string;
    label: string;
    holder: RoleEntity | null;
    from: string | null;
    to?: string | null;
  }[];
};

export type GroupLink = {
  orgnr: string;
  name: string;
  orgForm: string | null;
  parentOrgnr: string;
  parentName: string;
  label: string;
  depth: number;
  basis: string | null;
  share: number | null;
};

export type GroupResponse = {
  orgnr: string;
  companyName: string;
  status: string;
  root: { orgnr: string; name: string; orgForm: string | null } | null;
  members: number;
  links: GroupLink[];
  sourceUrl: string | null;
};

export type Announcement = {
  kid: string;
  type: string;
  announcedOn: string;
  register: string;
  body: string;
  event: string | null;
  url: string | null;
};

export type AnnouncementsResponse = { orgnr: string; companyName: string; announcements: Announcement[] };

export type Grant = {
  source: string;
  sourceLabel: string;
  grantor: string;
  scheme: string | null;
  subscheme: string | null;
  title: string | null;
  status: string;
  statusLabel: string;
  amountNok: number | null;
  instrument: string | null;
  decidedOn: string | null;
  year: number | null;
  region: string | null;
  summary: string | null;
  sourceUrl: string | null;
};

export type GrantsResponse = {
  orgnr: string;
  companyName: string;
  total: { count: number; granted: number; amountNok: number };
  grants: Grant[];
};

export type TenderParty = { name: string; orgnr: string | null };

export type BoughtTender = {
  id: string;
  doffinUrl: string;
  kindLabel: string;
  title: string;
  publishedOn: string | null;
  deadline: string | null;
  open: boolean;
  estimatedValue: number | null;
  currency: string | null;
  winners: number;
};

export type WonTender = {
  id: string;
  doffinUrl: string;
  kindLabel: string;
  title: string;
  lotTitle: string | null;
  publishedOn: string | null;
  awardedOn: string | null;
  buyer: TenderParty | null;
  value: number | null;
  currency: string | null;
  winnersInLot: number;
};

export type TendersResponse = {
  orgnr: string;
  companyName: string;
  summary: { won: number; wonValueNok: number; bought: number; open: number };
  won: WonTender[];
  bought: BoughtTender[];
};

export type IpRight = {
  kind: "trademark" | "patent" | "design";
  applicationNumber: string;
  title: string | null;
  statusLabel: string;
  alive: boolean;
  filedOn: string | null;
  registeredOn: string | null;
  expiresOn: string | null;
  classes: string[];
  caseUrl: string | null;
};

export type IpRightsResponse = {
  orgnr: string;
  companyName: string;
  summary: Record<string, number>;
  held: IpRight[];
  represented: IpRight[];
};

export type TransportLicense = {
  licenseNumber: string;
  licenseType: string;
  typeLabel: string;
  copies: number | null;
  firstSeen: string;
};

export type TransportLicensesResponse = {
  orgnr: string;
  companyName: string;
  registered: boolean;
  managers: string[];
  guarantors: TenderParty[];
  licences: TransportLicense[];
  sourceUrl: string | null;
};

export type FinancialLicense = {
  licenseCode: string;
  licenseName: string;
  detail: string | null;
  providerType: string | null;
  ownerOrgnr: string | null;
  ownerName: string | null;
  registeredOn: string | null;
};

export type FinancialLicensesResponse = {
  orgnr: string;
  companyName: string;
  registered: boolean;
  finanstilsynetUrl: string | null;
  licences: FinancialLicense[];
  agents: { orgnr: string | null; name: string; providerType: string | null; licences: string[] }[];
};

export type PersonResponse = {
  name: string;
  born: number;
  year: number | null;
  years: number[];
  positions: Holding[];
  roles: {
    orgnr: string;
    companyName: string;
    roleLabel: string;
    groupLabel: string;
    roleCode: string;
    resigned: boolean;
  }[];
};
