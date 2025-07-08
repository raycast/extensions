import axios from "axios";
import { Company, SearchResult } from "./types";

const BASE_URL = "https://data.brreg.no/enhetsregisteret/api";

export async function searchCompanies(query: string, limit = 20): Promise<SearchResult> {
  try {
    // Check if query looks like an organization number (9 digits, possibly with spaces)
    const isOrgNumber = /^\d{9}$|^\d{3}\s?\d{3}\s?\d{3}$/.test(query.replace(/\s/g, ""));

    let searchUrl: string;
    if (isOrgNumber) {
      // Search by organization number
      const cleanOrgNumber = query.replace(/\s/g, "");
      searchUrl = `${BASE_URL}/enheter/${cleanOrgNumber}`;
    } else {
      // Search by name
      searchUrl = `${BASE_URL}/enheter?navn=${encodeURIComponent(query)}&size=${limit}`;
    }

    const response = await axios.get(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Raycast-Brreg-Extension/1.0.0",
      },
    });

    const companies: Company[] = [];

    if (isOrgNumber) {
      // Single company response from org number search
      if (response.data) {
        const company = createCompanyFromBrregEntity(response.data);
        companies.push(company);
      }
    } else {
      // Multiple companies response from name search
      if (response.data && response.data._embedded && response.data._embedded.enheter) {
        response.data._embedded.enheter.forEach((entity: BrregEntity) => {
          const company = createCompanyFromBrregEntity(entity);
          companies.push(company);
        });
      }
    }

    return {
      companies,
      hasMore:
        !isOrgNumber && response.data.page
          ? response.data.page.totalElements > (response.data.page.number + 1) * response.data.page.size
          : false,
    };
  } catch (error) {
    console.error("Error searching companies:", error);
    return {
      companies: [],
      hasMore: false,
    };
  }
}

interface BrregEntity {
  navn?: string;
  organisasjonsnummer?: string;
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
  };
  naeringskode1?: {
    beskrivelse?: string;
  };
  antallAnsatte?: number;
  stiftelsesdato?: string;
  telefon?: string;
  epost?: string;
  hjemmeside?: string;
  vedtektsfestetFormaal?: string;
}

function createCompanyFromBrregEntity(entity: BrregEntity): Company {
  // Extract basic company information
  const name = entity.navn || "";
  const organizationNumber = entity.organisasjonsnummer || "";

  // Extract address information
  let address = "";
  let postalCode = "";
  let city = "";

  if (entity.forretningsadresse) {
    const addr = entity.forretningsadresse;
    const addressParts = [];
    if (addr.adresse) addressParts.push(...addr.adresse);
    if (addressParts.length > 0) address = addressParts.join(", ");
    postalCode = addr.postnummer || "";
    city = addr.poststed || "";
  }

  // Extract business information
  const industry = entity.naeringskode1?.beskrivelse || "";
  const employees = entity.antallAnsatte ? entity.antallAnsatte.toString() : "";
  const founded = entity.stiftelsesdato || "";

  // Extract contact information
  const phone = entity.telefon || "";
  const email = entity.epost || "";
  let website = entity.hjemmeside || "";

  // Ensure website URL has proper protocol and is valid
  if (website) {
    // Clean up common issues
    website = website.trim();
    // Remove any leading/trailing whitespace or invalid characters
    website = website.replace(/^[^\w]+|[^\w./-]+$/g, "");
    // Add protocol if missing
    if (!website.startsWith("http://") && !website.startsWith("https://")) {
      website = `https://${website}`;
    }

    // Validate URL format
    try {
      new URL(website);
    } catch {
      website = "";
    }
  }

  // Generate Brreg URL for "Open in Browser"
  const cleanOrgNumber = organizationNumber.replace(/\s+/g, "").trim();
  const bregUrl = cleanOrgNumber
    ? `https://virksomhet.brreg.no/oppslag/enheter/${cleanOrgNumber}`
    : `https://www.brreg.no/sok?q=${encodeURIComponent(name)}`;

  return {
    name,
    organizationNumber,
    address,
    postalCode,
    city,
    phone: phone || undefined,
    email: email || undefined,
    website: website || undefined,
    industry: industry || undefined,
    employees: employees || undefined,
    founded: founded || undefined,
    bregUrl: bregUrl,
  };
}

export async function getCompanyDetails(organizationNumber: string): Promise<Company | null> {
  try {
    const detailUrl = `${BASE_URL}/enheter/${organizationNumber}`;

    const response = await axios.get(detailUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Raycast-Norwegian-Companies/1.0.0",
      },
    });

    const entity = response.data;

    // Use the same parsing function but with more detailed data
    const company = createCompanyFromBrregEntity(entity);

    // Add any additional fields that might be available in the detailed view
    if (entity.vedtektsfestetFormaal) {
      company.description = entity.vedtektsfestetFormaal;
    }

    // Try to fetch annual accounts data
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
    } catch (error) {
      // Log error but don't throw, return null to handle gracefully
      console.error("Failed to fetch annual accounts:", error);
    }

    return company;
  } catch (error) {
    console.error("Error fetching company details from Brreg:", error);
    return null;
  }
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
} | null> {
  try {
    const accountsUrl = `https://data.brreg.no/regnskapsregisteret/regnskap/${organizationNumber}`;

    const response = await axios.get(accountsUrl, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "Raycast-Brreg/1.0.0",
      },
    });

    const xmlData = response.data;

    if (!xmlData || typeof xmlData !== "string") {
      return null;
    }

    // Parse the XML to extract financial data
    const formatCurrency = (amount: string) => {
      const num = parseFloat(amount);
      return new Intl.NumberFormat("no-NO", {
        style: "currency",
        currency: "NOK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    };

    // Extract values using regex (simple XML parsing)
    const extractValue = (tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "i");
      const match = xmlData.match(regex);
      return match ? match[1] : undefined;
    };

    const revenue = extractValue("sumDriftsinntekter");
    const operatingResult = extractValue("driftsresultat");
    const result = extractValue("aarsresultat");
    const equity = extractValue("sumEgenkapital");
    const totalAssets = extractValue("sumEiendeler");
    const totalDebt = extractValue("sumGjeld");
    const fromDate = extractValue("fraDato");
    const isNotAudited = extractValue("ikkeRevidertAarsregnskap");

    // Try to extract EBITDA-related fields (Norwegian accounting terms)
    const ebitda =
      extractValue("driftsresultatForAvskrivninger") ||
      extractValue("driftsresultatFoerAvskrivningOgNedskrivning") ||
      extractValue("driftsresultatForAvskrivningOgNedskrivning");
    const depreciation = extractValue("avskrivninger") || extractValue("avskrivningOgNedskrivning");

    return {
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
    };
  } catch (error) {
    console.error("Error fetching annual accounts:", error);
    return null;
  }
}
