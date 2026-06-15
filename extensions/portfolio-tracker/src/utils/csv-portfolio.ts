/**
 * CSV serialisation and deserialisation for Portfolio Import/Export.
 *
 * Provides pure functions to:
 *   - **Export** a Portfolio to a CSV string with columns for account,
 *     asset name, symbol, units, price, total value, currency, asset type,
 *     last updated date, and additional parameters (JSON).
 *   - **Parse** a CSV string back into validated rows, collecting errors
 *     for any rows with missing or invalid fields.
 *   - **Build** a Portfolio object from parsed CSV rows, grouping positions
 *     by account name and generating fresh UUIDs.
 *
 * CSV format:
 *   - Header row is mandatory on import and always emitted on export.
 *   - Fields are comma-separated, with double-quote escaping for values
 *     that contain commas, quotes, or newlines.
 *   - Encoding: UTF-8.
 *
 * Supported columns:
 *   Account, Account Type, Asset Name, Symbol, Units, Price, Total Value,
 *   Currency, Asset Type, Last Updated, Additional Parameters
 *
 * The "Additional Parameters" column contains a JSON object with non-standard
 * settings for specialised position types (mortgage, property, debt). This
 * allows full round-trip export/import of all position types. The JSON is
 * properly escaped for CSV (RFC 4180).
 *
 * Zero side effects, zero Raycast imports. Fully testable.
 *
 * @module csv-portfolio
 */

import {
  Portfolio,
  Account,
  Position,
  AccountType,
  AssetType,
  MortgageData,
  DebtData,
  isPropertyAssetType,
  isDebtAssetType,
} from "./types";
import { generateId } from "./uuid";

// ──────────────────────────────────────────
// CSV Column Definitions
// ──────────────────────────────────────────

/** Canonical column headers in export order */
export const CSV_HEADERS = [
  "Account",
  "Account Type",
  "Asset Name",
  "Symbol",
  "Units",
  "Price",
  "Total Value",
  "Currency",
  "Asset Type",
  "Last Updated",
  "Additional Parameters",
] as const;

export type CsvHeader = (typeof CSV_HEADERS)[number];

// ──────────────────────────────────────────
// Public Types
// ──────────────────────────────────────────

/** A single parsed row from the CSV, validated and typed */
export interface CsvRow {
  /** Account name (used for grouping) */
  accountName: string;
  /** Account type string (e.g. "ISA", "GIA") */
  accountType: string;
  /** Human-readable asset name */
  assetName: string;
  /** Ticker symbol (e.g. "VUSA.L") */
  symbol: string;
  /** Number of units held */
  units: number;
  /** Price per unit at export time */
  price: number;
  /** Total value (units × price) */
  totalValue: number;
  /** Currency code (e.g. "GBP") */
  currency: string;
  /** Asset type string (e.g. "ETF", "EQUITY") */
  assetType: string;
  /** ISO date string of last update */
  lastUpdated: string;
  /** JSON string of additional parameters for specialised position types */
  additionalParameters?: string;
}

/** A validation error on a specific CSV row */
export interface CsvValidationError {
  /** 1-based row number in the CSV (excluding header) */
  row: number;
  /** The column that failed validation */
  column: string;
  /** Human-readable error message */
  message: string;
  /** The raw value that caused the error (if available) */
  rawValue?: string;
}

/** Result of parsing a CSV string */
export interface CsvParseResult {
  /** Successfully parsed rows */
  rows: CsvRow[];
  /** Validation errors encountered */
  errors: CsvValidationError[];
  /** Rows that were skipped (e.g. property/debt) with reason */
  skipped: Array<{ row: number; reason: string }>;
  /** Total number of raw data rows (before validation) */
  totalRawRows: number;
}

/** Result of building a portfolio from CSV rows */
export interface CsvImportResult {
  /** The constructed portfolio */
  portfolio: Portfolio;
  /** Number of accounts created */
  accountCount: number;
  /** Number of positions imported */
  positionCount: number;
  /** Summary messages for the user */
  messages: string[];
}

/** Data used to compute Total Value on export (passed per position) */
export interface ExportPositionData {
  position: Position;
  accountName: string;
  accountType: AccountType;
  /** Current price per unit (from valuation or priceOverride) */
  currentPrice: number;
  /** Total value in native currency */
  totalValue: number;
}

// ──────────────────────────────────────────
// Account Type Mapping
// ──────────────────────────────────────────

/** Maps AccountType enum values to their CSV display labels */
const ACCOUNT_TYPE_TO_CSV: Record<AccountType, string> = {
  [AccountType.ISA]: "ISA",
  [AccountType.LISA]: "LISA",
  [AccountType.SIPP]: "SIPP",
  [AccountType.GIA]: "GIA",
  [AccountType._401K]: "401K",
  [AccountType.BROKERAGE]: "BROKERAGE",
  [AccountType.CRYPTO]: "CRYPTO",
  [AccountType.CURRENT_ACCOUNT]: "CURRENT ACCOUNT",
  [AccountType.SAVINGS_ACCOUNT]: "SAVINGS ACCOUNT",
  [AccountType.PROPERTY]: "PROPERTY",
  [AccountType.DEBT]: "DEBT",
  [AccountType.OTHER]: "OTHER",
};

/** Reverse lookup: CSV label → AccountType (case-insensitive) */
const CSV_TO_ACCOUNT_TYPE: Record<string, AccountType> = {};
for (const [enumVal, csvLabel] of Object.entries(ACCOUNT_TYPE_TO_CSV)) {
  CSV_TO_ACCOUNT_TYPE[csvLabel.toUpperCase()] = enumVal as AccountType;
}

/** Maps AssetType enum values to their CSV display labels */
const ASSET_TYPE_TO_CSV: Record<AssetType, string> = {
  [AssetType.EQUITY]: "EQUITY",
  [AssetType.ETF]: "ETF",
  [AssetType.MUTUALFUND]: "MUTUALFUND",
  [AssetType.INDEX]: "INDEX",
  [AssetType.CURRENCY]: "CURRENCY",
  [AssetType.CRYPTOCURRENCY]: "CRYPTOCURRENCY",
  [AssetType.OPTION]: "OPTION",
  [AssetType.FUTURE]: "FUTURE",
  [AssetType.CASH]: "CASH",
  [AssetType.MORTGAGE]: "MORTGAGE",
  [AssetType.OWNED_PROPERTY]: "OWNED_PROPERTY",
  [AssetType.CREDIT_CARD]: "CREDIT_CARD",
  [AssetType.LOAN]: "LOAN",
  [AssetType.STUDENT_LOAN]: "STUDENT_LOAN",
  [AssetType.AUTO_LOAN]: "AUTO_LOAN",
  [AssetType.BNPL]: "BNPL",
  [AssetType.UNKNOWN]: "UNKNOWN",
};

/** Reverse lookup: CSV label → AssetType (case-insensitive) */
const CSV_TO_ASSET_TYPE: Record<string, AssetType> = {};
for (const [enumVal, csvLabel] of Object.entries(ASSET_TYPE_TO_CSV)) {
  CSV_TO_ASSET_TYPE[csvLabel.toUpperCase()] = enumVal as AssetType;
}

/** Asset types that have additional parameters (mortgage/property/debt data) */
const SPECIALISED_ASSET_TYPES = new Set<string>([
  AssetType.MORTGAGE,
  AssetType.OWNED_PROPERTY,
  AssetType.CREDIT_CARD,
  AssetType.LOAN,
  AssetType.STUDENT_LOAN,
  AssetType.AUTO_LOAN,
  AssetType.BNPL,
]);

// ──────────────────────────────────────────
// CSV Escaping
// ──────────────────────────────────────────

/**
 * Escapes a value for CSV output according to RFC 4180.
 * Wraps in double quotes if the value contains a comma, double quote,
 * or newline. Internal double quotes are doubled.
 */
export function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats a number for CSV output — no thousand separators, full precision.
 */
function formatCsvNumber(value: number, decimals: number = 2): string {
  // Use fixed decimal places but strip trailing zeros after decimal point
  if (Number.isInteger(value) && decimals <= 0) {
    return value.toString();
  }
  return value.toFixed(decimals);
}

// ──────────────────────────────────────────
// Export
// ──────────────────────────────────────────

/**
 * Exports a portfolio to a CSV string.
 *
 * Each position becomes one row. Positions are grouped by account.
 * Property and debt positions are included for completeness but are
 * marked with their specialised asset types.
 *
 * @param positions - Pre-computed position data with valuations
 * @returns Complete CSV string with header row and one row per position
 *
 * @example
 * const csv = exportPortfolioToCsv(positionData);
 * // "Account,Account Type,Asset Name,Symbol,Units,Price,Total Value,Currency,Asset Type,Last Updated\n..."
 */
export function exportPortfolioToCsv(positions: ExportPositionData[]): string {
  const lines: string[] = [];

  // Header
  lines.push(CSV_HEADERS.map(escapeCsvField).join(","));

  // Data rows
  for (const data of positions) {
    const { position, accountName, accountType, currentPrice, totalValue } = data;
    const displayName = position.customName ?? position.name;
    const assetTypeLabel = ASSET_TYPE_TO_CSV[position.assetType] ?? position.assetType;
    const accountTypeLabel = ACCOUNT_TYPE_TO_CSV[accountType] ?? accountType;

    // Build additional parameters JSON for specialised position types
    const additionalParams = buildAdditionalParameters(position);

    const row = [
      escapeCsvField(accountName),
      escapeCsvField(accountTypeLabel),
      escapeCsvField(displayName),
      escapeCsvField(position.symbol),
      formatCsvNumber(position.units, 4),
      formatCsvNumber(currentPrice, 2),
      formatCsvNumber(totalValue, 2),
      escapeCsvField(position.currency),
      escapeCsvField(assetTypeLabel),
      escapeCsvField(position.addedAt),
      escapeCsvField(additionalParams),
    ];

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

// ──────────────────────────────────────────
// Additional Parameters (JSON serialisation)
// ──────────────────────────────────────────

/**
 * Builds a JSON string of additional parameters for specialised position types.
 *
 * For MORTGAGE / OWNED_PROPERTY positions, serialises MortgageData fields.
 * For debt positions (CREDIT_CARD, LOAN, etc.), serialises DebtData fields.
 * For standard positions, returns an empty string.
 *
 * The keys in the JSON are ordered alphabetically for consistency.
 * Values use dot-notation-friendly keys (camelCase) matching the interface fields.
 *
 * @param position - The position to extract additional parameters from
 * @returns JSON string or empty string if no additional parameters
 */
export function buildAdditionalParameters(position: Position): string {
  if (position.mortgageData) {
    const md = position.mortgageData;
    // Build object with consistent key order (alphabetical)
    const params: Record<string, unknown> = {
      equity: md.equity,
      mortgageRate: md.mortgageRate,
      mortgageStartDate: md.mortgageStartDate,
      mortgageTerm: md.mortgageTerm,
      myEquityShare: md.myEquityShare,
      postcode: md.postcode,
      sharedOwnershipPercent: md.sharedOwnershipPercent,
      totalPropertyValue: md.totalPropertyValue,
      valuationDate: md.valuationDate,
    };
    // Strip undefined values for cleaner JSON
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
    return JSON.stringify(clean);
  }

  if (position.debtData) {
    const dd = position.debtData;
    const params: Record<string, unknown> = {
      apr: dd.apr,
      archived: dd.archived,
      currentBalance: dd.currentBalance,
      enteredAt: dd.enteredAt,
      loanEndDate: dd.loanEndDate,
      loanStartDate: dd.loanStartDate,
      monthlyRepayment: dd.monthlyRepayment,
      paidOff: dd.paidOff,
      repaymentDayOfMonth: dd.repaymentDayOfMonth,
      totalTermMonths: dd.totalTermMonths,
    };
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
    return JSON.stringify(clean);
  }

  return "";
}

/**
 * Parses a JSON string of additional parameters back into MortgageData or DebtData.
 *
 * Returns `{ mortgageData, debtData }` — at most one will be set.
 * Returns empty object if the JSON is empty, invalid, or not applicable.
 *
 * @param json - The JSON string from the "Additional Parameters" CSV column
 * @param assetType - The resolved AssetType to determine which interface to map to
 * @returns Object with optional mortgageData and/or debtData
 */
export function parseAdditionalParameters(
  json: string | undefined,
  assetType: AssetType,
): { mortgageData?: MortgageData; debtData?: DebtData } {
  if (!json || json.trim().length === 0) return {};

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null) return {};

  // Mortgage / Property positions
  if (assetType === AssetType.MORTGAGE || assetType === AssetType.OWNED_PROPERTY) {
    const md: MortgageData = {
      totalPropertyValue: toNumber(parsed.totalPropertyValue) ?? 0,
      equity: toNumber(parsed.equity) ?? 0,
      valuationDate: toString(parsed.valuationDate) ?? new Date().toISOString().split("T")[0],
      postcode: toString(parsed.postcode) ?? "",
    };
    // Optional fields
    if (parsed.mortgageRate !== undefined) md.mortgageRate = toNumber(parsed.mortgageRate);
    if (parsed.mortgageTerm !== undefined) md.mortgageTerm = toNumber(parsed.mortgageTerm);
    if (parsed.mortgageStartDate !== undefined) md.mortgageStartDate = toString(parsed.mortgageStartDate);
    if (parsed.sharedOwnershipPercent !== undefined)
      md.sharedOwnershipPercent = toNumber(parsed.sharedOwnershipPercent);
    if (parsed.myEquityShare !== undefined) md.myEquityShare = toNumber(parsed.myEquityShare);

    return { mortgageData: md };
  }

  // Debt positions (MORTGAGE and OWNED_PROPERTY already handled above and returned)
  if (SPECIALISED_ASSET_TYPES.has(assetType)) {
    const dd: DebtData = {
      currentBalance: toNumber(parsed.currentBalance) ?? 0,
      apr: toNumber(parsed.apr) ?? 0,
      repaymentDayOfMonth: toNumber(parsed.repaymentDayOfMonth) ?? 1,
      monthlyRepayment: toNumber(parsed.monthlyRepayment) ?? 0,
      enteredAt: toString(parsed.enteredAt) ?? new Date().toISOString(),
    };
    // Optional fields
    if (parsed.loanStartDate !== undefined) dd.loanStartDate = toString(parsed.loanStartDate);
    if (parsed.loanEndDate !== undefined) dd.loanEndDate = toString(parsed.loanEndDate);
    if (parsed.totalTermMonths !== undefined) dd.totalTermMonths = toNumber(parsed.totalTermMonths);
    if (parsed.paidOff !== undefined) dd.paidOff = parsed.paidOff === true;
    if (parsed.archived !== undefined) dd.archived = parsed.archived === true;

    return { debtData: dd };
  }

  return {};
}

/** Safe number coercion helper */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (!isNaN(n)) return n;
  }
  return undefined;
}

/** Safe string coercion helper */
function toString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

/**
 * Convenience function to build ExportPositionData from a Portfolio and optional valuations.
 *
 * When no valuation data is available, uses priceOverride or 0 as fallback.
 *
 * @param portfolio - The portfolio to export
 * @param priceMap  - Optional map of positionId → { price, totalValue }
 * @returns Array of ExportPositionData ready for exportPortfolioToCsv
 */
export function buildExportData(
  portfolio: Portfolio,
  priceMap?: Map<string, { price: number; totalValue: number }>,
): ExportPositionData[] {
  const result: ExportPositionData[] = [];

  for (const account of portfolio.accounts) {
    for (const position of account.positions) {
      const priceInfo = priceMap?.get(position.id);
      const currentPrice = priceInfo?.price ?? position.priceOverride ?? 0;
      const totalValue = priceInfo?.totalValue ?? position.units * currentPrice;

      result.push({
        position,
        accountName: account.name,
        accountType: account.type,
        currentPrice,
        totalValue,
      });
    }
  }

  return result;
}

// ──────────────────────────────────────────
// CSV Parsing
// ──────────────────────────────────────────

/**
 * Parses a raw CSV line into fields, respecting quoted fields.
 *
 * Handles:
 *   - Simple comma-separated values
 *   - Double-quoted fields containing commas, quotes, newlines
 *   - Escaped quotes ("") within quoted fields
 *
 * @param line - A single CSV line (may contain quoted newlines already resolved)
 * @returns Array of unescaped field values
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  // Push the last field
  fields.push(current);

  return fields;
}

/**
 * Splits CSV content into logical lines, handling multi-line quoted fields.
 *
 * A quoted field may span multiple lines. This function merges physical
 * lines that are inside a quoted field into a single logical line.
 *
 * @param content - Raw CSV file content
 * @returns Array of logical CSV lines
 */
export function splitCsvLines(content: string): string[] {
  const lines: string[] = [];
  const physicalLines = content.split(/\r?\n/);
  let current = "";
  let inQuotes = false;

  for (const physicalLine of physicalLines) {
    if (current.length > 0) {
      current += "\n" + physicalLine;
    } else {
      current = physicalLine;
    }

    // Count unescaped quotes to determine if we're inside a quoted field
    for (const char of physicalLine) {
      if (char === '"') {
        inQuotes = !inQuotes;
      }
    }

    if (!inQuotes) {
      lines.push(current);
      current = "";
    }
  }

  // If there's remaining content (unclosed quote), push it as-is
  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Maps header names from the CSV to canonical column indices.
 *
 * Performs case-insensitive matching and supports common aliases
 * (e.g. "Asset" for "Asset Name", "Type" for "Account Type").
 *
 * @param headers - Array of header strings from the first CSV line
 * @returns Map of canonical CsvHeader → column index, or null if essential headers are missing
 */
export function mapHeaders(headers: string[]): { mapping: Map<CsvHeader, number>; missing: CsvHeader[] } {
  const normalised = headers.map((h) => h.trim().toUpperCase());
  const mapping = new Map<CsvHeader, number>();

  // Aliases for flexible matching
  const aliases: Record<string, CsvHeader> = {
    ACCOUNT: "Account",
    "ACCOUNT NAME": "Account",
    "ACCOUNT TYPE": "Account Type",
    "ASSET NAME": "Asset Name",
    ASSET: "Asset Name",
    NAME: "Asset Name",
    SYMBOL: "Symbol",
    TICKER: "Symbol",
    UNITS: "Units",
    QUANTITY: "Units",
    SHARES: "Units",
    PRICE: "Price",
    "PRICE PER UNIT": "Price",
    "TOTAL VALUE": "Total Value",
    VALUE: "Total Value",
    TOTAL: "Total Value",
    CURRENCY: "Currency",
    CCY: "Currency",
    "ASSET TYPE": "Asset Type",
    TYPE: "Asset Type",
    "LAST UPDATED": "Last Updated",
    UPDATED: "Last Updated",
    DATE: "Last Updated",
    "LAST UPDATED DATE": "Last Updated",
    "ADDITIONAL PARAMETERS": "Additional Parameters",
    "ADDITIONAL PARAMS": "Additional Parameters",
    PARAMS: "Additional Parameters",
    EXTRA: "Additional Parameters",
  };

  for (let i = 0; i < normalised.length; i++) {
    const canonical = aliases[normalised[i]];
    if (canonical && !mapping.has(canonical)) {
      mapping.set(canonical, i);
    }
  }

  // Check for essential columns
  const essential: CsvHeader[] = ["Account", "Asset Name", "Symbol", "Units", "Currency"];
  const missing = essential.filter((h) => !mapping.has(h));

  return { mapping, missing };
}

/**
 * Parses a CSV string into validated rows.
 *
 * Validates each row's fields and collects errors. Rows with missing
 * essential fields (Account, Asset Name, Symbol, Units, Currency) are
 * rejected. Optional fields use sensible defaults.
 *
 * Property and debt rows are skipped with a message (they require
 * specialised data that a CSV cannot represent).
 *
 * @param csvContent - Raw CSV file content
 * @returns Parse result with validated rows, errors, and skipped rows
 */
export function parsePortfolioCsv(csvContent: string): CsvParseResult {
  const result: CsvParseResult = {
    rows: [],
    errors: [],
    skipped: [],
    totalRawRows: 0,
  };

  if (!csvContent || csvContent.trim().length === 0) {
    result.errors.push({ row: 0, column: "File", message: "CSV file is empty" });
    return result;
  }

  const lines = splitCsvLines(csvContent.trim());

  if (lines.length < 2) {
    result.errors.push({
      row: 0,
      column: "File",
      message: "CSV file must have a header row and at least one data row",
    });
    return result;
  }

  // Parse header
  const headerFields = parseCsvLine(lines[0]);
  const { mapping, missing } = mapHeaders(headerFields);

  if (missing.length > 0) {
    result.errors.push({
      row: 0,
      column: "Header",
      message: `Missing required columns: ${missing.join(", ")}`,
    });
    return result;
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue; // Skip blank lines

    result.totalRawRows++;
    const rowNum = i; // 1-based (header is line 0)
    const fields = parseCsvLine(line);

    const getValue = (header: CsvHeader): string => {
      const idx = mapping.get(header);
      if (idx === undefined || idx >= fields.length) return "";
      return fields[idx].trim();
    };

    // ── Extract required fields ──
    const accountName = getValue("Account");
    const assetName = getValue("Asset Name");
    const symbol = getValue("Symbol");
    const unitsStr = getValue("Units");
    const currency = getValue("Currency");

    // ── Validate required fields ──
    const rowErrors: CsvValidationError[] = [];

    if (!accountName) {
      rowErrors.push({ row: rowNum, column: "Account", message: "Account name is required" });
    }
    if (!assetName) {
      rowErrors.push({ row: rowNum, column: "Asset Name", message: "Asset name is required" });
    }
    if (!symbol) {
      rowErrors.push({ row: rowNum, column: "Symbol", message: "Symbol is required" });
    }
    if (!currency) {
      rowErrors.push({ row: rowNum, column: "Currency", message: "Currency is required" });
    }

    // Validate units
    const units = parseFloat(unitsStr);
    if (!unitsStr) {
      rowErrors.push({ row: rowNum, column: "Units", message: "Units is required" });
    } else if (isNaN(units)) {
      rowErrors.push({ row: rowNum, column: "Units", message: "Units must be a number", rawValue: unitsStr });
    } else if (units < 0) {
      rowErrors.push({ row: rowNum, column: "Units", message: "Units cannot be negative", rawValue: unitsStr });
    }

    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      continue;
    }

    // ── Extract optional fields ──
    const accountType = getValue("Account Type") || "OTHER";
    const priceStr = getValue("Price");
    const totalValueStr = getValue("Total Value");
    const assetTypeStr = getValue("Asset Type") || "UNKNOWN";
    const lastUpdated = getValue("Last Updated") || new Date().toISOString();
    const additionalParameters = getValue("Additional Parameters") || "";

    // Validate optional numeric fields
    const price = priceStr ? parseFloat(priceStr) : 0;
    if (priceStr && isNaN(price)) {
      rowErrors.push({ row: rowNum, column: "Price", message: "Price must be a number", rawValue: priceStr });
    }

    const totalValue = totalValueStr ? parseFloat(totalValueStr) : units * price;
    if (totalValueStr && isNaN(totalValue)) {
      rowErrors.push({
        row: rowNum,
        column: "Total Value",
        message: "Total Value must be a number",
        rawValue: totalValueStr,
      });
    }

    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      continue;
    }

    // ── Check for specialised asset types without additional parameters ──
    const resolvedAssetType = CSV_TO_ASSET_TYPE[assetTypeStr.toUpperCase()] ?? AssetType.UNKNOWN;
    if (SPECIALISED_ASSET_TYPES.has(resolvedAssetType) && !additionalParameters) {
      result.skipped.push({
        row: rowNum,
        reason: `${assetTypeStr} positions require additional parameters (JSON) to import. Add them manually in Portfolio Tracker or re-export with the Additional Parameters column.`,
      });
      continue;
    }

    // ── Build validated row ──
    result.rows.push({
      accountName,
      accountType,
      assetName,
      symbol,
      units,
      price,
      totalValue,
      currency: currency.toUpperCase(),
      assetType: assetTypeStr.toUpperCase(),
      lastUpdated,
      additionalParameters: additionalParameters || undefined,
    });
  }

  return result;
}

// ──────────────────────────────────────────
// Import (Build Portfolio from CSV Rows)
// ──────────────────────────────────────────

/**
 * Builds a Portfolio object from validated CSV rows.
 *
 * Groups rows by account name, creating accounts and positions with
 * fresh UUIDs. For CASH positions, sets units = totalValue and price = 1.
 *
 * @param rows - Validated CSV rows from parsePortfolioCsv
 * @returns Import result with the constructed portfolio and summary stats
 */
export function buildPortfolioFromCsvRows(rows: CsvRow[]): CsvImportResult {
  const messages: string[] = [];

  if (rows.length === 0) {
    return {
      portfolio: { accounts: [], updatedAt: new Date().toISOString() },
      accountCount: 0,
      positionCount: 0,
      messages: ["No valid rows to import."],
    };
  }

  // Group by account name
  const accountMap = new Map<string, { type: AccountType; positions: Position[] }>();

  for (const row of rows) {
    if (!accountMap.has(row.accountName)) {
      const accountType = CSV_TO_ACCOUNT_TYPE[row.accountType.toUpperCase()] ?? AccountType.OTHER;
      accountMap.set(row.accountName, { type: accountType, positions: [] });
    }

    const assetType = CSV_TO_ASSET_TYPE[row.assetType.toUpperCase()] ?? AssetType.UNKNOWN;

    // Parse additional parameters for specialised position types
    const { mortgageData, debtData } = parseAdditionalParameters(row.additionalParameters, assetType);

    // Market-traded assets (EQUITY, ETF, MUTUALFUND, etc.) must NOT get a
    // priceOverride from the CSV — they should fetch live prices from Yahoo
    // Finance so that Day Change works correctly. Only non-market asset types
    // (which don't call Yahoo Finance) retain the CSV price as an override.
    const isMarketTraded =
      !isPropertyAssetType(assetType) && !isDebtAssetType(assetType) && assetType !== AssetType.CASH;
    const priceOverride = !isMarketTraded && row.price > 0 ? row.price : undefined;

    const position: Position = {
      id: generateId(),
      symbol: row.symbol,
      name: row.assetName,
      units: row.units,
      currency: row.currency,
      assetType,
      priceOverride,
      addedAt: row.lastUpdated || new Date().toISOString(),
      ...(mortgageData ? { mortgageData } : {}),
      ...(debtData ? { debtData } : {}),
    };

    accountMap.get(row.accountName)!.positions.push(position);
  }

  // Build accounts
  const now = new Date().toISOString();
  const accounts: Account[] = [];

  for (const [name, data] of accountMap) {
    accounts.push({
      id: generateId(),
      name,
      type: data.type,
      createdAt: now,
      positions: data.positions,
    });
  }

  const portfolio: Portfolio = {
    accounts,
    updatedAt: now,
  };

  messages.push(
    `Imported ${rows.length} position${rows.length === 1 ? "" : "s"} across ${accounts.length} account${accounts.length === 1 ? "" : "s"}.`,
  );

  return {
    portfolio,
    accountCount: accounts.length,
    positionCount: rows.length,
    messages,
  };
}

// ──────────────────────────────────────────
// Merge Helpers
// ──────────────────────────────────────────

/**
 * Merges imported accounts into an existing portfolio.
 *
 * Matching logic:
 *   - If an account with the same name AND type already exists,
 *     new positions are appended to it.
 *   - If a position with the same symbol already exists in the
 *     matched account, the user gets a choice: skip, add (new entry),
 *     or replace. This function always adds (caller can pre-filter).
 *   - If no matching account exists, a new account is created.
 *
 * @param existing - The current portfolio
 * @param imported - The imported portfolio from CSV
 * @returns Merged portfolio with updated timestamps
 */
export function mergePortfolios(existing: Portfolio, imported: Portfolio): Portfolio {
  const now = new Date().toISOString();
  const mergedAccounts = [...existing.accounts];

  for (const importedAccount of imported.accounts) {
    // Find existing account with same name (case-insensitive) and type
    const existingAccount = mergedAccounts.find(
      (a) => a.name.toLowerCase() === importedAccount.name.toLowerCase() && a.type === importedAccount.type,
    );

    if (existingAccount) {
      // Append new positions to the existing account
      existingAccount.positions = [...existingAccount.positions, ...importedAccount.positions];
    } else {
      // Create a new account
      mergedAccounts.push({
        ...importedAccount,
        id: generateId(),
        createdAt: now,
      });
    }
  }

  return {
    accounts: mergedAccounts,
    updatedAt: now,
  };
}

/**
 * Counts duplicate symbols that already exist in the target portfolio.
 *
 * Used by the import UI to warn the user about potential duplicates
 * before committing the merge.
 *
 * @param existing  - The current portfolio
 * @param imported  - The imported portfolio from CSV
 * @returns Array of { symbol, accountName, count } for duplicates
 */
export function findDuplicates(
  existing: Portfolio,
  imported: Portfolio,
): Array<{ symbol: string; accountName: string; existingCount: number }> {
  const duplicates: Array<{ symbol: string; accountName: string; existingCount: number }> = [];

  for (const importedAccount of imported.accounts) {
    const existingAccount = existing.accounts.find(
      (a) => a.name.toLowerCase() === importedAccount.name.toLowerCase() && a.type === importedAccount.type,
    );

    if (!existingAccount) continue;

    for (const importedPosition of importedAccount.positions) {
      const existingMatches = existingAccount.positions.filter(
        (p) => p.symbol.toUpperCase() === importedPosition.symbol.toUpperCase(),
      );

      if (existingMatches.length > 0) {
        duplicates.push({
          symbol: importedPosition.symbol,
          accountName: importedAccount.name,
          existingCount: existingMatches.length,
        });
      }
    }
  }

  return duplicates;
}

// ──────────────────────────────────────────
// File Name Helper
// ──────────────────────────────────────────

/**
 * Generates a default CSV filename with the current date.
 *
 * @returns Filename string, e.g. "portfolio-export-2025-07-15.csv"
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split("T")[0];
  return `portfolio-export-${date}.csv`;
}
