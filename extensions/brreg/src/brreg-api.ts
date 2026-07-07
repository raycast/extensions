import { Company, Enhet } from "./types";
import type { FinancialYear } from "./types";
import { getBregUrl, getVatRegistrationStatus, normalizeWebsiteUrl } from "./utils/entity";
import { USER_AGENT } from "./constants";
import { toNumber, formatCurrency } from "./utils/format";
import { TTLCache } from "./utils/ttl-cache";

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api";

const TEN_MINUTES = 10 * 60 * 1000;
const companyCache = new TTLCache<string, Company>(TEN_MINUTES);
const searchCache = new TTLCache<string, Enhet[]>(TEN_MINUTES);

export interface BrregEntity {
  navn?: string;
  organisasjonsnummer?: string;
  organisasjonsform?: {
    kode?: string;
    beskrivelse?: string;
  };
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    kommune?: string;
    kommunenummer?: string;
  };
  naeringskode1?: {
    kode?: string;
    beskrivelse?: string;
  };
  antallAnsatte?: number;
  stiftelsesdato?: string;
  telefon?: string;
  epost?: string;
  hjemmeside?: string;
  vedtektsfestetFormaal?: string | string[];
  mvaRegistrert?: boolean;
  registrertIMvaregisteret?: boolean;
}

export function createCompanyFromBrregEntity(entity: BrregEntity): Company {
  const name = entity.navn || "";
  const organizationNumber = entity.organisasjonsnummer || "";

  let address = "";
  let postalCode = "";
  let city = "";

  if (entity.forretningsadresse) {
    const addr = entity.forretningsadresse;
    const addressParts: string[] = [];
    if (addr.adresse) addressParts.push(...addr.adresse);
    if (addressParts.length > 0) address = addressParts.join(", ");
    postalCode = addr.postnummer || "";
    city = addr.poststed || "";
  }

  const industry = entity.naeringskode1?.beskrivelse || "";
  const naceCode = entity.naeringskode1?.kode || undefined;
  const employees = entity.antallAnsatte ? entity.antallAnsatte.toString() : "";
  const founded = entity.stiftelsesdato || "";

  const phone = entity.telefon || "";
  const email = entity.epost || "";
  const website = normalizeWebsiteUrl(entity.hjemmeside);

  const cleanOrgNumber = organizationNumber.replace(/\s+/g, "").trim();
  const bregUrl = cleanOrgNumber
    ? getBregUrl(cleanOrgNumber)
    : `https://www.brreg.no/sok?q=${encodeURIComponent(name)}`;

  const isVatRegistered = getVatRegistrationStatus(entity);

  return {
    name,
    organizationNumber,
    organizationFormCode: entity.organisasjonsform?.kode,
    organizationFormDescription: entity.organisasjonsform?.beskrivelse,
    address,
    postalCode,
    city,
    municipality: entity.forretningsadresse?.kommune,
    municipalityNumber: entity.forretningsadresse?.kommunenummer,
    phone: phone || undefined,
    email: email || undefined,
    website,
    industry: industry || undefined,
    naceCode,
    employees: employees || undefined,
    founded: founded || undefined,
    bregUrl,
    isVatRegistered,
  };
}

export async function getCompanyDetails(organizationNumber: string): Promise<Company | null> {
  const cached = companyCache.get(organizationNumber);
  if (cached) return cached;

  try {
    const detailUrl = `${BASE_URL}/enheter/${organizationNumber}`;
    const response = await fetch(detailUrl, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
      return null;
    }

    const entity = (await response.json()) as BrregEntity;
    const company = createCompanyFromBrregEntity(entity);

    if (entity.vedtektsfestetFormaal) {
      const raw = entity.vedtektsfestetFormaal;
      const text = Array.isArray(raw) ? raw.join(" ") : raw;
      // Normalize common punctuation anomalies from BRREG
      company.description = text
        .replace(/\s*,\s*,+/g, ", ") // collapse duplicate commas
        .replace(/\s{2,}/g, " ") // collapse multiple spaces
        .trim();
    }

    try {
      const financialData = await getAnnualAccounts(organizationNumber);
      if (financialData) {
        company.revenue = financialData.revenue;
        company.operatingResult = financialData.operatingResult;
        company.result = financialData.result;
        company.equity = financialData.equity;
        company.totalAssets = financialData.totalAssets;
        company.totalDebt = financialData.totalDebt;
        company.ebitda = financialData.ebitda;
        company.depreciation = financialData.depreciation;
        company.accountingYear = financialData.accountingYear;
        company.isAuditRequired = financialData.isAuditRequired;
        company.isAudited = financialData.isAudited;
      }
    } catch {
      // ignore financial errors
    }

    companyCache.set(organizationNumber, company);
    return company;
  } catch {
    return null;
  }
}

// Search entities by name or organization number via Enhetsregisteret
export async function searchEntities(query: string): Promise<Enhet[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cached = searchCache.get(trimmed);
  if (cached) return cached;

  const isNumeric = /^\d+$/.test(trimmed);
  const paramName = isNumeric ? "organisasjonsnummer" : "navn";
  const response = await fetch(`${BASE_URL}/enheter?${paramName}=${encodeURIComponent(trimmed)}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  const data = (await response.json()) as { _embedded?: { enheter?: Enhet[] } };
  const results = (data._embedded?.enheter || []).map((entity) => ({
    ...entity,
    website: normalizeWebsiteUrl(entity.website ?? entity.hjemmeside),
  }));
  searchCache.set(trimmed, results);
  return results;
}

export async function getAnnualAccounts(organizationNumber: string): Promise<{
  revenue?: string;
  operatingResult?: string;
  result?: string;
  equity?: string;
  totalAssets?: string;
  totalDebt?: string;
  ebitda?: string;
  depreciation?: string;
  accountingYear?: string;
  isAuditRequired?: boolean;
  isAudited?: boolean;
  financialHistory?: FinancialYear[];
} | null> {
  try {
    const accountsUrl = `https://data.brreg.no/regnskapsregisteret/regnskap/${organizationNumber}`;
    const response = await fetch(accountsUrl, {
      headers: { Accept: "application/xml", "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const xmlData = await response.text();
    if (!xmlData) return null;

    const extractValue = (tag: string): string | undefined => {
      // Use [\0-\uFFFF] to approximate any char without escaping \s/\S to satisfy linter
      const anyChar = "[\\0-\\uFFFF]";
      const regex = new RegExp(`<${tag}>(${anyChar}*?)</${tag}>`, "i");
      const match = xmlData.match(regex);
      return match ? match[1] : undefined;
    };

    const extractValueInWindow = (start: number, end: number, tag: string): string | undefined => {
      const slice = xmlData.slice(Math.max(0, start), Math.min(xmlData.length, end));
      const anyChar = "[\\0-\\uFFFF]";
      const regex = new RegExp(`<${tag}>(${anyChar}*?)</${tag}>`, "i");
      const m = slice.match(regex);
      return m ? m[1] : undefined;
    };

    const findAllTagPositions = (tag: string): Array<{ value: string; index: number }> => {
      const anyChar = "[\\0-\\uFFFF]";
      const regex = new RegExp(`<${tag}>(${anyChar}*?)</${tag}>`, "gi");
      const results: Array<{ value: string; index: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(xmlData)) !== null) {
        results.push({ value: m[1], index: m.index });
      }
      return results;
    };

    const parseBoolean = (value?: string): boolean | undefined => {
      if (value === undefined) return undefined;
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
      return undefined;
    };

    const revenue = extractValue("sumDriftsinntekter");
    const operatingResult = extractValue("driftsresultat");
    const result = extractValue("aarsresultat");
    const equity = extractValue("sumEgenkapital");
    const totalAssets = extractValue("sumEiendeler");
    const totalDebt = extractValue("sumGjeld");
    const fromDate = extractValue("fraDato");
    const toDate = extractValue("tilDato");
    const isNotAudited = parseBoolean(extractValue("ikkeRevidertAarsregnskap"));
    const hasOptedOutOfAudit = parseBoolean(
      extractValue("fravalgRevisjon") ?? extractValue("fravalgtArsregnskap") ?? extractValue("fravalgtRevisjon"),
    );

    const ebitda =
      extractValue("driftsresultatForAvskrivninger") ||
      extractValue("driftsresultatFoerAvskrivningOgNedskrivning") ||
      extractValue("driftsresultatForAvskrivningOgNedskrivning");
    const depreciation = extractValue("avskrivninger") || extractValue("avskrivningOgNedskrivning");

    // Single year summary
    const summary = {
      revenue: revenue ? formatCurrency(revenue) : undefined,
      operatingResult: operatingResult ? formatCurrency(operatingResult) : undefined,
      result: result ? formatCurrency(result) : undefined,
      equity: equity ? formatCurrency(equity) : undefined,
      totalAssets: totalAssets ? formatCurrency(totalAssets) : undefined,
      totalDebt: totalDebt ? formatCurrency(totalDebt) : undefined,
      ebitda: ebitda ? formatCurrency(ebitda) : undefined,
      depreciation: depreciation ? formatCurrency(depreciation) : undefined,
      accountingYear: fromDate ? new Date(fromDate).getFullYear().toString() : undefined,
      isAuditRequired: hasOptedOutOfAudit === undefined ? undefined : !hasOptedOutOfAudit,
      isAudited:
        hasOptedOutOfAudit === true || isNotAudited === true ? false : isNotAudited === false ? true : undefined,
      // pass through raw dates for layout enrichment
      ...(fromDate ? { lastAccountsFromDate: fromDate } : {}),
      ...(toDate ? { lastAccountsToDate: toDate } : {}),
    } as const;

    // Build up to last 5 years by scanning around each period occurrence
    const periodMatches = findAllTagPositions("fraDato");
    const candidateByYear = new Map<number, FinancialYear>();
    for (const p of periodMatches) {
      const yr = p.value ? new Date(p.value).getFullYear() : NaN;
      if (!yr || Number.isNaN(yr)) continue;
      const windowStart = p.index - 3000;
      const windowEnd = p.index + 3000;
      const revW = extractValueInWindow(windowStart, windowEnd, "sumDriftsinntekter");
      const oprW = extractValueInWindow(windowStart, windowEnd, "driftsresultat");
      const resW = extractValueInWindow(windowStart, windowEnd, "aarsresultat");
      const ebitdaW =
        extractValueInWindow(windowStart, windowEnd, "driftsresultatForAvskrivninger") ||
        extractValueInWindow(windowStart, windowEnd, "driftsresultatFoerAvskrivningOgNedskrivning") ||
        extractValueInWindow(windowStart, windowEnd, "driftsresultatForAvskrivningOgNedskrivning");
      const fy: FinancialYear = {
        year: yr,
        revenue: revW !== undefined ? toNumber(revW) : undefined,
        operatingResult: oprW !== undefined ? toNumber(oprW) : undefined,
        result: resW !== undefined ? toNumber(resW) : undefined,
        ebitda: ebitdaW !== undefined ? toNumber(ebitdaW) : undefined,
      };
      candidateByYear.set(yr, fy);
    }
    const financialHistory: FinancialYear[] = Array.from(candidateByYear.values())
      .sort((a, b) => a.year - b.year)
      .slice(-5);

    return { ...summary, financialHistory: financialHistory.length ? financialHistory : undefined };
  } catch {
    return null;
  }
}
