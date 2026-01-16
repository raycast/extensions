import fetch from "node-fetch";
import { Company, Enhet } from "./types";
import type { FinancialYear } from "./types";

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api";

interface BrregEntity {
  navn?: string;
  organisasjonsnummer?: string;
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

function createCompanyFromBrregEntity(entity: BrregEntity): Company {
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
  let website = entity.hjemmeside || "";

  if (website) {
    website = website.trim();
    website = website.replace(/^[^\w]+|[^\w./-]+$/g, "");
    if (!website.startsWith("http://") && !website.startsWith("https://")) {
      website = `https://${website}`;
    }
    try {
      new URL(website);
    } catch {
      website = "";
    }
  }

  const cleanOrgNumber = organizationNumber.replace(/\s+/g, "").trim();
  const bregUrl = cleanOrgNumber
    ? `https://virksomhet.brreg.no/oppslag/enheter/${cleanOrgNumber}`
    : `https://www.brreg.no/sok?q=${encodeURIComponent(name)}`;

  const isVatRegistered =
    typeof entity.mvaRegistrert === "boolean"
      ? entity.mvaRegistrert
      : typeof entity.registrertIMvaregisteret === "boolean"
        ? entity.registrertIMvaregisteret
        : undefined;

  return {
    name,
    organizationNumber,
    address,
    postalCode,
    city,
    municipality: entity.forretningsadresse?.kommune,
    municipalityNumber: entity.forretningsadresse?.kommunenummer,
    phone: phone || undefined,
    email: email || undefined,
    website: website || undefined,
    industry: industry || undefined,
    naceCode,
    employees: employees || undefined,
    founded: founded || undefined,
    bregUrl,
    isVatRegistered,
  };
}

export async function getCompanyDetails(organizationNumber: string): Promise<Company | null> {
  try {
    const detailUrl = `${BASE_URL}/enheter/${organizationNumber}`;
    const response = await fetch(detailUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Raycast-Brreg-Search/1.0.0",
      },
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
        company.isAudited = financialData.isAudited;
      }
    } catch {
      // ignore financial errors
    }

    return company;
  } catch {
    return null;
  }
}

// Search entities by name or organization number via Enhetsregisteret
export async function searchEntities(query: string): Promise<Enhet[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const isNumeric = /^\d+$/.test(trimmed);
  const paramName = isNumeric ? "organisasjonsnummer" : "navn";
  const response = await fetch(`${BASE_URL}/enheter?${paramName}=${encodeURIComponent(trimmed)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Raycast-Brreg-Search/1.0.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  const data = (await response.json()) as { _embedded?: { enheter?: Enhet[] } };
  return data._embedded?.enheter || [];
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
  isAudited?: boolean;
  financialHistory?: FinancialYear[];
} | null> {
  try {
    const accountsUrl = `https://data.brreg.no/regnskapsregisteret/regnskap/${organizationNumber}`;
    const response = await fetch(accountsUrl, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "Raycast-Brreg-Search/1.0.0",
      },
    });
    if (!response.ok) return null;
    const xmlData = await response.text();
    if (!xmlData) return null;

    const toNumber = (raw: string): number | undefined => {
      if (!raw) return undefined;
      let text = String(raw).trim();
      const wasParenNegative = /^\(.*\)$/.test(text);
      if (wasParenNegative) text = text.slice(1, -1);
      text = text.replace(/[\s\u00A0]/g, "");
      text = text.replace(/[^0-9,.-]/g, "");
      if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "");
      text = text.replace(/,/g, ".");
      const num = parseFloat(text);
      if (Number.isNaN(num)) return undefined;
      return wasParenNegative ? -num : num;
    };

    const formatCurrency = (amount: string) => {
      const num = toNumber(amount);
      if (num === undefined) return undefined;
      return new Intl.NumberFormat("no-NO", {
        style: "currency",
        currency: "NOK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    };

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

    const revenue = extractValue("sumDriftsinntekter");
    const operatingResult = extractValue("driftsresultat");
    const result = extractValue("aarsresultat");
    const equity = extractValue("sumEgenkapital");
    const totalAssets = extractValue("sumEiendeler");
    const totalDebt = extractValue("sumGjeld");
    const fromDate = extractValue("fraDato");
    const toDate = extractValue("tilDato");
    const isNotAudited = extractValue("ikkeRevidertAarsregnskap");

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
      isAudited: isNotAudited !== "true",
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
