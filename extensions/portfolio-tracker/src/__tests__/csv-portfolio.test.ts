/**
 * Tests for CSV Portfolio Import/Export (Roadmap Phase 2, Item 8).
 *
 * Covers:
 *   - exportPortfolioToCsv: CSV generation from position data
 *   - parseCsvLine: RFC 4180 compliant field parsing
 *   - splitCsvLines: multi-line quoted field handling
 *   - mapHeaders: flexible header matching with aliases
 *   - parsePortfolioCsv: full CSV parsing with validation
 *   - buildPortfolioFromCsvRows: portfolio construction from parsed rows
 *   - mergePortfolios: merging imported data into existing portfolio
 *   - findDuplicates: duplicate symbol detection
 *   - escapeCsvField: RFC 4180 escaping
 *   - buildExportData: export data construction from portfolio
 *   - generateExportFilename: date-stamped filename generation
 *
 * All functions under test are pure (no Raycast imports, no side effects),
 * so no mocks are needed.
 */

import {
  exportPortfolioToCsv,
  parseCsvLine,
  splitCsvLines,
  mapHeaders,
  parsePortfolioCsv,
  buildPortfolioFromCsvRows,
  mergePortfolios,
  findDuplicates,
  escapeCsvField,
  buildExportData,
  generateExportFilename,
  buildAdditionalParameters,
  parseAdditionalParameters,
  CSV_HEADERS,
  CsvRow,
  ExportPositionData,
} from "../utils/csv-portfolio";
import { Portfolio, Account, Position, AccountType, AssetType, MortgageData, DebtData } from "../utils/types";

// ──────────────────────────────────────────
// Test Helpers
// ──────────────────────────────────────────

function makePosition(overrides: Partial<Position> = {}): Position {
  return {
    id: "test-pos-1",
    symbol: "VUSA.L",
    name: "Vanguard S&P 500 UCITS ETF",
    units: 50,
    currency: "GBP",
    assetType: AssetType.ETF,
    addedAt: "2024-03-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}, positions?: Position[]): Account {
  return {
    id: "test-acc-1",
    name: "Vanguard ISA",
    type: AccountType.ISA,
    createdAt: "2024-01-01T00:00:00.000Z",
    positions: positions ?? [makePosition()],
    ...overrides,
  };
}

function makePortfolio(accounts?: Account[]): Portfolio {
  return {
    accounts: accounts ?? [makeAccount()],
    updatedAt: "2024-07-15T12:00:00.000Z",
  };
}

function makeExportData(overrides: Partial<ExportPositionData> = {}): ExportPositionData {
  const position = makePosition(overrides.position ? overrides.position : {});
  return {
    position,
    accountName: "Vanguard ISA",
    accountType: AccountType.ISA,
    currentPrice: 72.45,
    totalValue: 3622.5,
    ...overrides,
  };
}

function buildSimpleCsv(rows: string[]): string {
  const header =
    "Account,Account Type,Asset Name,Symbol,Units,Price,Total Value,Currency,Asset Type,Last Updated,Additional Parameters";
  return [header, ...rows].join("\n");
}

// ──────────────────────────────────────────
// escapeCsvField
// ──────────────────────────────────────────

describe("escapeCsvField", () => {
  it("returns plain strings unchanged", () => {
    expect(escapeCsvField("Hello")).toBe("Hello");
  });

  it("wraps fields with commas in double quotes", () => {
    expect(escapeCsvField("Hello, World")).toBe('"Hello, World"');
  });

  it("wraps fields with double quotes and escapes them", () => {
    expect(escapeCsvField('Say "hello"')).toBe('"Say ""hello"""');
  });

  it("wraps fields with newlines in double quotes", () => {
    expect(escapeCsvField("Line1\nLine2")).toBe('"Line1\nLine2"');
  });

  it("wraps fields with carriage returns in double quotes", () => {
    expect(escapeCsvField("Line1\rLine2")).toBe('"Line1\rLine2"');
  });

  it("handles empty string", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("handles fields with commas AND quotes", () => {
    expect(escapeCsvField('A "B", C')).toBe('"A ""B"", C"');
  });
});

// ──────────────────────────────────────────
// parseCsvLine
// ──────────────────────────────────────────

describe("parseCsvLine", () => {
  it("splits simple comma-separated values", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCsvLine('"Hello, World",b,c')).toEqual(["Hello, World", "b", "c"]);
  });

  it("handles escaped double quotes within quoted fields", () => {
    expect(parseCsvLine('"Say ""hello""",b')).toEqual(['Say "hello"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
  });

  it("handles a single field", () => {
    expect(parseCsvLine("onlyfield")).toEqual(["onlyfield"]);
  });

  it("handles trailing comma (empty last field)", () => {
    expect(parseCsvLine("a,b,")).toEqual(["a", "b", ""]);
  });

  it("handles leading comma (empty first field)", () => {
    expect(parseCsvLine(",b,c")).toEqual(["", "b", "c"]);
  });

  it("handles all empty fields", () => {
    expect(parseCsvLine(",,")).toEqual(["", "", ""]);
  });

  it("handles quoted field with newline inside", () => {
    expect(parseCsvLine('"Line1\nLine2",b')).toEqual(["Line1\nLine2", "b"]);
  });

  it("handles numeric fields", () => {
    expect(parseCsvLine("50,72.45,3622.50")).toEqual(["50", "72.45", "3622.50"]);
  });

  it("handles the full header row", () => {
    const fields = parseCsvLine(CSV_HEADERS.join(","));
    expect(fields).toHaveLength(CSV_HEADERS.length);
    expect(fields[0]).toBe("Account");
    expect(fields[fields.length - 1]).toBe("Additional Parameters");
  });
});

// ──────────────────────────────────────────
// splitCsvLines
// ──────────────────────────────────────────

describe("splitCsvLines", () => {
  it("splits simple lines on newline", () => {
    expect(splitCsvLines("a\nb\nc")).toEqual(["a", "b", "c"]);
  });

  it("handles Windows-style line endings", () => {
    expect(splitCsvLines("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
  });

  it("merges lines that are inside a quoted field", () => {
    const csv = 'a,"hello\nworld",c\nd,e,f';
    const lines = splitCsvLines(csv);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('a,"hello\nworld",c');
    expect(lines[1]).toBe("d,e,f");
  });

  it("handles empty content", () => {
    expect(splitCsvLines("")).toEqual([""]);
  });

  it("handles single line (no newlines)", () => {
    expect(splitCsvLines("a,b,c")).toEqual(["a,b,c"]);
  });

  it("handles trailing newline", () => {
    const lines = splitCsvLines("a\nb\n");
    expect(lines).toEqual(["a", "b", ""]);
  });
});

// ──────────────────────────────────────────
// mapHeaders
// ──────────────────────────────────────────

describe("mapHeaders", () => {
  it("maps canonical headers correctly", () => {
    const { mapping, missing } = mapHeaders(CSV_HEADERS as unknown as string[]);
    expect(missing).toHaveLength(0);
    expect(mapping.get("Account")).toBe(0);
    expect(mapping.get("Asset Name")).toBe(2);
    expect(mapping.get("Symbol")).toBe(3);
    expect(mapping.get("Units")).toBe(4);
    expect(mapping.get("Currency")).toBe(7);
  });

  it("is case-insensitive", () => {
    const { mapping, missing } = mapHeaders([
      "account",
      "account type",
      "asset name",
      "symbol",
      "units",
      "price",
      "total value",
      "currency",
      "asset type",
      "last updated",
    ]);
    expect(missing).toHaveLength(0);
    expect(mapping.get("Account")).toBe(0);
  });

  it("supports alias 'Ticker' for 'Symbol'", () => {
    const { mapping } = mapHeaders(["Account", "Asset Name", "Ticker", "Units", "Currency"]);
    expect(mapping.get("Symbol")).toBe(2);
  });

  it("supports alias 'Quantity' for 'Units'", () => {
    const { mapping } = mapHeaders(["Account", "Asset Name", "Symbol", "Quantity", "Currency"]);
    expect(mapping.get("Units")).toBe(3);
  });

  it("supports alias 'Shares' for 'Units'", () => {
    const { mapping } = mapHeaders(["Account", "Asset Name", "Symbol", "Shares", "Currency"]);
    expect(mapping.get("Units")).toBe(3);
  });

  it("supports alias 'Name' for 'Asset Name'", () => {
    const { mapping } = mapHeaders(["Account", "Name", "Symbol", "Units", "Currency"]);
    expect(mapping.get("Asset Name")).toBe(1);
  });

  it("supports alias 'CCY' for 'Currency'", () => {
    const { mapping } = mapHeaders(["Account", "Asset Name", "Symbol", "Units", "CCY"]);
    expect(mapping.get("Currency")).toBe(4);
  });

  it("supports alias 'Value' for 'Total Value'", () => {
    const { mapping } = mapHeaders(["Account", "Asset Name", "Symbol", "Units", "Currency", "Value"]);
    expect(mapping.get("Total Value")).toBe(5);
  });

  it("supports alias 'Date' for 'Last Updated'", () => {
    const { mapping } = mapHeaders(["Account", "Asset Name", "Symbol", "Units", "Currency", "Date"]);
    expect(mapping.get("Last Updated")).toBe(5);
  });

  it("reports missing essential columns", () => {
    const { missing } = mapHeaders(["Price", "Value"]);
    expect(missing).toContain("Account");
    expect(missing).toContain("Asset Name");
    expect(missing).toContain("Symbol");
    expect(missing).toContain("Units");
    expect(missing).toContain("Currency");
  });

  it("handles extra columns gracefully", () => {
    const { mapping, missing } = mapHeaders([
      "Account",
      "Extra1",
      "Asset Name",
      "Symbol",
      "Extra2",
      "Units",
      "Currency",
    ]);
    expect(missing).toHaveLength(0);
    expect(mapping.get("Account")).toBe(0);
    expect(mapping.get("Asset Name")).toBe(2);
    expect(mapping.get("Symbol")).toBe(3);
    expect(mapping.get("Units")).toBe(5);
    expect(mapping.get("Currency")).toBe(6);
  });

  it("uses the first matching alias when duplicates exist", () => {
    const { mapping } = mapHeaders(["Account", "Name", "Asset Name", "Symbol", "Units", "Currency"]);
    // "Name" matches first
    expect(mapping.get("Asset Name")).toBe(1);
  });
});

// ──────────────────────────────────────────
// exportPortfolioToCsv
// ──────────────────────────────────────────

describe("exportPortfolioToCsv", () => {
  it("returns a header row for empty data", () => {
    const csv = exportPortfolioToCsv([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Account");
    expect(lines[0]).toContain("Symbol");
  });

  it("produces one header line plus one data line per position", () => {
    const data = [makeExportData()];
    const csv = exportPortfolioToCsv(data);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
  });

  it("includes account name, asset name, symbol, units, price, total value, currency", () => {
    const data = [makeExportData()];
    const csv = exportPortfolioToCsv(data);

    expect(csv).toContain("Vanguard ISA");
    expect(csv).toContain("Vanguard S&P 500 UCITS ETF");
    expect(csv).toContain("VUSA.L");
    expect(csv).toContain("50.0000");
    expect(csv).toContain("72.45");
    expect(csv).toContain("3622.50");
    expect(csv).toContain("GBP");
    expect(csv).toContain("ETF");
  });

  it("includes account type in the output", () => {
    const data = [makeExportData()];
    const csv = exportPortfolioToCsv(data);
    expect(csv).toContain("ISA");
  });

  it("uses customName when present instead of original name", () => {
    const pos = makePosition({ customName: "S&P 500 Tracker" });
    const data = [makeExportData({ position: pos })];
    const csv = exportPortfolioToCsv(data);

    expect(csv).toContain("S&P 500 Tracker");
    expect(csv).not.toContain("Vanguard S&P 500 UCITS ETF");
  });

  it("escapes fields with commas", () => {
    const pos = makePosition({ name: "iShares, Core MSCI" });
    const data = [makeExportData({ position: pos })];
    const csv = exportPortfolioToCsv(data);
    expect(csv).toContain('"iShares, Core MSCI"');
  });

  it("handles multiple positions across multiple accounts", () => {
    const data: ExportPositionData[] = [
      makeExportData({ accountName: "ISA Account" }),
      makeExportData({
        position: makePosition({ id: "p2", symbol: "AAPL", name: "Apple Inc.", currency: "USD" }),
        accountName: "US Brokerage",
        accountType: AccountType.BROKERAGE,
        currentPrice: 195.5,
        totalValue: 9775.0,
      }),
    ];

    const csv = exportPortfolioToCsv(data);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(csv).toContain("ISA Account");
    expect(csv).toContain("US Brokerage");
    expect(csv).toContain("AAPL");
  });

  it("includes the addedAt date in the Last Updated column", () => {
    const data = [makeExportData()];
    const csv = exportPortfolioToCsv(data);
    expect(csv).toContain("2024-03-15T10:00:00.000Z");
  });

  it("exports CASH positions correctly", () => {
    const pos = makePosition({
      symbol: "CASH-GBP",
      name: "Cash (GBP)",
      assetType: AssetType.CASH,
      units: 5000,
    });
    const data = [makeExportData({ position: pos, currentPrice: 1, totalValue: 5000 })];
    const csv = exportPortfolioToCsv(data);
    expect(csv).toContain("CASH");
    expect(csv).toContain("5000.0000");
  });

  it("exports debt positions with their asset type label", () => {
    const pos = makePosition({
      symbol: "DEBT-CC",
      name: "Credit Card",
      assetType: AssetType.CREDIT_CARD,
      units: 1,
    });
    const data = [
      makeExportData({ position: pos, currentPrice: 5000, totalValue: 5000, accountType: AccountType.DEBT }),
    ];
    const csv = exportPortfolioToCsv(data);
    expect(csv).toContain("CREDIT_CARD");
    expect(csv).toContain("DEBT");
  });

  it("exports property positions with their asset type label", () => {
    const pos = makePosition({
      symbol: "PROPERTY-1",
      name: "Main Residence",
      assetType: AssetType.MORTGAGE,
      units: 1,
    });
    const data = [
      makeExportData({ position: pos, currentPrice: 350000, totalValue: 350000, accountType: AccountType.PROPERTY }),
    ];
    const csv = exportPortfolioToCsv(data);
    expect(csv).toContain("MORTGAGE");
    expect(csv).toContain("PROPERTY");
  });

  it("header contains all canonical columns", () => {
    const csv = exportPortfolioToCsv([]);
    const headerLine = csv.split("\n")[0];
    for (const header of CSV_HEADERS) {
      expect(headerLine).toContain(header);
    }
  });
});

// ──────────────────────────────────────────
// buildExportData
// ──────────────────────────────────────────

describe("buildExportData", () => {
  it("returns empty array for empty portfolio", () => {
    const portfolio = makePortfolio([]);
    const data = buildExportData(portfolio);
    expect(data).toEqual([]);
  });

  it("returns one entry per position", () => {
    const portfolio = makePortfolio([
      makeAccount({ id: "a1", name: "ISA" }, [
        makePosition({ id: "p1", symbol: "VUSA.L" }),
        makePosition({ id: "p2", symbol: "VWRL.L" }),
      ]),
    ]);

    const data = buildExportData(portfolio);
    expect(data).toHaveLength(2);
    expect(data[0].position.symbol).toBe("VUSA.L");
    expect(data[1].position.symbol).toBe("VWRL.L");
    expect(data[0].accountName).toBe("ISA");
  });

  it("uses priceMap values when provided", () => {
    const portfolio = makePortfolio([makeAccount({ id: "a1" }, [makePosition({ id: "p1", units: 10 })])]);

    const priceMap = new Map([["p1", { price: 100, totalValue: 1000 }]]);
    const data = buildExportData(portfolio, priceMap);

    expect(data[0].currentPrice).toBe(100);
    expect(data[0].totalValue).toBe(1000);
  });

  it("falls back to priceOverride when no priceMap", () => {
    const portfolio = makePortfolio([
      makeAccount({ id: "a1" }, [makePosition({ id: "p1", priceOverride: 55.5, units: 10 })]),
    ]);

    const data = buildExportData(portfolio);
    expect(data[0].currentPrice).toBe(55.5);
    expect(data[0].totalValue).toBe(555);
  });

  it("falls back to 0 when no price info available", () => {
    const portfolio = makePortfolio([makeAccount({ id: "a1" }, [makePosition({ id: "p1", units: 10 })])]);

    const data = buildExportData(portfolio);
    expect(data[0].currentPrice).toBe(0);
    expect(data[0].totalValue).toBe(0);
  });

  it("maps across multiple accounts", () => {
    const portfolio = makePortfolio([
      makeAccount({ id: "a1", name: "ISA" }, [makePosition({ id: "p1" })]),
      makeAccount({ id: "a2", name: "GIA", type: AccountType.GIA }, [makePosition({ id: "p2", symbol: "AAPL" })]),
    ]);

    const data = buildExportData(portfolio);
    expect(data).toHaveLength(2);
    expect(data[0].accountName).toBe("ISA");
    expect(data[1].accountName).toBe("GIA");
    expect(data[1].accountType).toBe(AccountType.GIA);
  });
});

// ──────────────────────────────────────────
// parsePortfolioCsv
// ──────────────────────────────────────────

describe("parsePortfolioCsv", () => {
  it("returns error for empty content", () => {
    const result = parsePortfolioCsv("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("empty");
  });

  it("returns error for whitespace-only content", () => {
    const result = parsePortfolioCsv("   \n  ");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns error for header-only content (no data rows)", () => {
    const result = parsePortfolioCsv(CSV_HEADERS.join(","));
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("header row and at least one data row");
  });

  it("returns error when essential columns are missing", () => {
    const csv = "Price,Value\n100,1000";
    const result = parsePortfolioCsv(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].column).toBe("Header");
    expect(result.errors[0].message).toContain("Missing required columns");
  });

  it("parses a valid CSV with all columns", () => {
    const csv = buildSimpleCsv([
      "My ISA,ISA,Vanguard S&P 500,VUSA.L,50,72.45,3622.50,GBP,ETF,2024-03-15T10:00:00.000Z",
    ]);

    const result = parsePortfolioCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.accountName).toBe("My ISA");
    expect(row.accountType).toBe("ISA");
    expect(row.assetName).toBe("Vanguard S&P 500");
    expect(row.symbol).toBe("VUSA.L");
    expect(row.units).toBe(50);
    expect(row.price).toBe(72.45);
    expect(row.totalValue).toBe(3622.5);
    expect(row.currency).toBe("GBP");
    expect(row.assetType).toBe("ETF");
    expect(row.lastUpdated).toBe("2024-03-15T10:00:00.000Z");
  });

  it("parses multiple rows", () => {
    const csv = buildSimpleCsv([
      "ISA,ISA,Vanguard S&P 500,VUSA.L,50,72.45,3622.50,GBP,ETF,2024-03-15",
      "GIA,GIA,Apple Inc.,AAPL,10,195.50,1955.00,USD,EQUITY,2024-06-01",
    ]);

    const result = parsePortfolioCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].symbol).toBe("VUSA.L");
    expect(result.rows[1].symbol).toBe("AAPL");
  });

  it("reports error when account name is missing", () => {
    const csv = buildSimpleCsv([",ISA,Asset,SYM,10,100,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Account")).toBe(true);
  });

  it("reports error when symbol is missing", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,,10,100,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Symbol")).toBe(true);
  });

  it("reports error when units is not a number", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,abc,100,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Units" && e.message.includes("number"))).toBe(true);
  });

  it("reports error when units is negative", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,-5,100,-500,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Units" && e.message.includes("negative"))).toBe(true);
  });

  it("reports error when currency is missing", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,100,1000,,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Currency")).toBe(true);
  });

  it("reports error when asset name is missing", () => {
    const csv = buildSimpleCsv(["ISA,ISA,,SYM,10,100,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Asset Name")).toBe(true);
  });

  it("reports error when price is not a number", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,xyz,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Price")).toBe(true);
  });

  it("reports error when total value is not a number", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,100,abc,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.errors.some((e) => e.column === "Total Value")).toBe(true);
  });

  it("defaults account type to OTHER when missing", () => {
    const csv = buildSimpleCsv(["ISA,,Asset,SYM,10,100,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].accountType).toBe("OTHER");
  });

  it("defaults asset type to UNKNOWN when missing", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,100,1000,GBP,,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].assetType).toBe("UNKNOWN");
  });

  it("defaults price to 0 when missing", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,,1000,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].price).toBe(0);
  });

  it("calculates totalValue as units * price when total value column is missing", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,50,,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].totalValue).toBe(500);
  });

  it("skips blank lines", () => {
    const csv = buildSimpleCsv([
      "ISA,ISA,Asset1,SYM1,10,100,1000,GBP,ETF,2024-01-01",
      "",
      "ISA,ISA,Asset2,SYM2,20,200,4000,GBP,ETF,2024-01-01",
    ]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(2);
  });

  it("skips property (MORTGAGE) rows without additional parameters", () => {
    const csv = buildSimpleCsv(["Prop,PROPERTY,Main House,PROPERTY-1,1,350000,350000,GBP,MORTGAGE,2024-01-01,"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toContain("additional parameters");
  });

  it("skips debt (CREDIT_CARD) rows without additional parameters", () => {
    const csv = buildSimpleCsv(["Debt,DEBT,My Card,DEBT-CC,1,5000,5000,GBP,CREDIT_CARD,2024-01-01,"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toContain("additional parameters");
  });

  it("skips LOAN rows without additional parameters", () => {
    const csv = buildSimpleCsv(["Debt,DEBT,Student,DEBT-SL,1,10000,10000,GBP,STUDENT_LOAN,2024-01-01,"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it("skips BNPL rows without additional parameters", () => {
    const csv = buildSimpleCsv(["Debt,DEBT,Klarna,DEBT-BNPL,1,500,500,GBP,BNPL,2024-01-01,"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it("imports MORTGAGE rows when additional parameters are provided", () => {
    const params = JSON.stringify({
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-06-15",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2020-01-15",
    });
    const csv = buildSimpleCsv([
      `Prop,PROPERTY,Main House,PROPERTY-1,1,350000,350000,GBP,MORTGAGE,2024-01-01,"${params.replace(/"/g, '""')}"`,
    ]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.rows[0].assetType).toBe("MORTGAGE");
    expect(result.rows[0].additionalParameters).toBeTruthy();
  });

  it("imports CREDIT_CARD rows when additional parameters are provided", () => {
    const params = JSON.stringify({
      currentBalance: 5000,
      apr: 19.9,
      repaymentDayOfMonth: 15,
      monthlyRepayment: 300,
      enteredAt: "2025-01-01T00:00:00Z",
    });
    const csv = buildSimpleCsv([
      `Debt,DEBT,My Card,DEBT-CC,1,5000,5000,GBP,CREDIT_CARD,2024-01-01,"${params.replace(/"/g, '""')}"`,
    ]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.rows[0].assetType).toBe("CREDIT_CARD");
    expect(result.rows[0].additionalParameters).toBeTruthy();
  });

  it("handles mixed valid, invalid, and skipped rows", () => {
    const csv = buildSimpleCsv([
      "ISA,ISA,Asset1,SYM1,10,100,1000,GBP,ETF,2024-01-01,", // valid
      ",,,,,,,,,,,", // invalid (empty fields)
      "Prop,PROPERTY,House,PROP-1,1,350000,350000,GBP,MORTGAGE,2024-01-01,", // skipped (no params)
      "GIA,GIA,Asset2,SYM2,abc,100,1000,GBP,EQUITY,2024-01-01,", // error (non-numeric units)
      "GIA,GIA,Asset3,SYM3,20,200,4000,USD,EQUITY,2024-06-01,", // valid
    ]);

    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.totalRawRows).toBe(5);
  });

  it("uppercases currency codes", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,100,1000,gbp,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows[0].currency).toBe("GBP");
  });

  it("uppercases asset type", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,10,100,1000,GBP,etf,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows[0].assetType).toBe("ETF");
  });

  it("handles quoted asset names with commas", () => {
    const csv = buildSimpleCsv(['"ISA",ISA,"iShares, Core MSCI",SYM,10,100,1000,GBP,ETF,2024-01-01']);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].assetName).toBe("iShares, Core MSCI");
  });

  it("collects multiple errors on the same row", () => {
    const csv = buildSimpleCsv([",,,,,,,,,,"]);
    const result = parsePortfolioCsv(csv);
    // Missing: Account, Asset Name, Symbol, Units, Currency = at least 5 errors
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
    // All errors should reference row 1
    expect(result.errors.every((e) => e.row === 1)).toBe(true);
  });

  it("continues parsing after encountering errors", () => {
    const csv = buildSimpleCsv([
      "ISA,ISA,Bad,SYM,abc,100,1000,GBP,ETF,2024-01-01", // error
      "ISA,ISA,Good,SYM2,10,100,1000,GBP,ETF,2024-01-01", // valid
    ]);

    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].symbol).toBe("SYM2");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("tracks totalRawRows correctly", () => {
    const csv = buildSimpleCsv([
      "ISA,ISA,A,S1,10,100,1000,GBP,ETF,2024-01-01",
      "ISA,ISA,B,S2,20,200,4000,GBP,ETF,2024-01-01",
      "ISA,ISA,C,S3,30,300,9000,GBP,ETF,2024-01-01",
    ]);

    const result = parsePortfolioCsv(csv);
    expect(result.totalRawRows).toBe(3);
  });

  it("allows units of 0 (e.g. sold position)", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,0,100,0,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].units).toBe(0);
  });

  it("handles fractional units", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Asset,SYM,12.5678,100,1256.78,GBP,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows[0].units).toBeCloseTo(12.5678, 4);
  });
});

// ──────────────────────────────────────────
// buildPortfolioFromCsvRows
// ──────────────────────────────────────────

describe("buildPortfolioFromCsvRows", () => {
  it("returns empty portfolio for empty rows", () => {
    const result = buildPortfolioFromCsvRows([]);
    expect(result.portfolio.accounts).toHaveLength(0);
    expect(result.accountCount).toBe(0);
    expect(result.positionCount).toBe(0);
    expect(result.messages[0]).toContain("No valid rows");
  });

  it("groups positions by account name", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "B",
        symbol: "S2",
        units: 20,
        price: 200,
        totalValue: 4000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
      {
        accountName: "GIA",
        accountType: "GIA",
        assetName: "C",
        symbol: "S3",
        units: 30,
        price: 300,
        totalValue: 9000,
        currency: "USD",
        assetType: "EQUITY",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.accountCount).toBe(2);
    expect(result.positionCount).toBe(3);

    const isa = result.portfolio.accounts.find((a) => a.name === "ISA");
    expect(isa).toBeDefined();
    expect(isa!.positions).toHaveLength(2);
    expect(isa!.type).toBe(AccountType.ISA);

    const gia = result.portfolio.accounts.find((a) => a.name === "GIA");
    expect(gia).toBeDefined();
    expect(gia!.positions).toHaveLength(1);
    expect(gia!.type).toBe(AccountType.GIA);
  });

  it("generates unique UUIDs for accounts and positions", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "B",
        symbol: "S2",
        units: 20,
        price: 200,
        totalValue: 4000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    const account = result.portfolio.accounts[0];

    // Account and positions should have unique IDs
    expect(account.id).toBeTruthy();
    expect(account.positions[0].id).toBeTruthy();
    expect(account.positions[1].id).toBeTruthy();
    expect(account.positions[0].id).not.toBe(account.positions[1].id);
    expect(account.id).not.toBe(account.positions[0].id);
  });

  it("does not set priceOverride for market-traded assets even when price > 0", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 99.5,
        totalValue: 995,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    // Market-traded assets (ETF) should NOT get priceOverride — they use live
    // Yahoo Finance prices so that Day Change works correctly.
    expect(result.portfolio.accounts[0].positions[0].priceOverride).toBeUndefined();
  });

  it("sets priceOverride for non-market asset types (CASH)", () => {
    const rows: CsvRow[] = [
      {
        accountName: "Savings",
        accountType: "SAVINGS_ACCOUNT",
        assetName: "GBP Cash",
        symbol: "GBP",
        units: 5000,
        price: 1,
        totalValue: 5000,
        currency: "GBP",
        assetType: "CASH",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    // Non-market asset types retain priceOverride since they don't use Yahoo Finance
    expect(result.portfolio.accounts[0].positions[0].priceOverride).toBe(1);
  });

  it("does not set priceOverride when price is 0", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 0,
        totalValue: 0,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].positions[0].priceOverride).toBeUndefined();
  });

  it("maps account type correctly", () => {
    const rows: CsvRow[] = [
      {
        accountName: "My SIPP",
        accountType: "SIPP",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].type).toBe(AccountType.SIPP);
  });

  it("maps asset type correctly", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "MUTUALFUND",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].positions[0].assetType).toBe(AssetType.MUTUALFUND);
  });

  it("defaults unknown account type to OTHER", () => {
    const rows: CsvRow[] = [
      {
        accountName: "Custom",
        accountType: "WEIRD",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].type).toBe(AccountType.OTHER);
  });

  it("defaults unknown asset type to UNKNOWN", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "WEIRD",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].positions[0].assetType).toBe(AssetType.UNKNOWN);
  });

  it("includes a summary message", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toContain("1 position");
    expect(result.messages[0]).toContain("1 account");
  });

  it("pluralises correctly for multiple items", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
      {
        accountName: "GIA",
        accountType: "GIA",
        assetName: "B",
        symbol: "S2",
        units: 20,
        price: 200,
        totalValue: 4000,
        currency: "USD",
        assetType: "EQUITY",
        lastUpdated: "2024-01-01",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.messages[0]).toContain("positions");
    expect(result.messages[0]).toContain("accounts");
  });

  it("sets addedAt from lastUpdated", () => {
    const rows: CsvRow[] = [
      {
        accountName: "ISA",
        accountType: "ISA",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "GBP",
        assetType: "ETF",
        lastUpdated: "2024-07-15T09:30:00.000Z",
      },
    ];

    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].positions[0].addedAt).toBe("2024-07-15T09:30:00.000Z");
  });
});

// ──────────────────────────────────────────
// mergePortfolios
// ──────────────────────────────────────────

describe("mergePortfolios", () => {
  it("adds new accounts to the existing portfolio", () => {
    const existing = makePortfolio([makeAccount({ id: "a1", name: "ISA" })]);
    const imported = makePortfolio([makeAccount({ id: "a2", name: "GIA", type: AccountType.GIA })]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(2);
    expect(merged.accounts.find((a) => a.name === "GIA")).toBeDefined();
  });

  it("appends positions to matching account (same name and type)", () => {
    const existing = makePortfolio([
      makeAccount({ id: "a1", name: "ISA", type: AccountType.ISA }, [makePosition({ id: "p1", symbol: "VUSA.L" })]),
    ]);

    const imported = makePortfolio([
      makeAccount({ id: "a2", name: "ISA", type: AccountType.ISA }, [makePosition({ id: "p2", symbol: "AAPL" })]),
    ]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0].positions).toHaveLength(2);
    expect(merged.accounts[0].positions[0].symbol).toBe("VUSA.L");
    expect(merged.accounts[0].positions[1].symbol).toBe("AAPL");
  });

  it("does not match accounts with same name but different type", () => {
    const existing = makePortfolio([makeAccount({ id: "a1", name: "Investment", type: AccountType.ISA })]);
    const imported = makePortfolio([makeAccount({ id: "a2", name: "Investment", type: AccountType.GIA })]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(2);
  });

  it("matches account names case-insensitively", () => {
    const existing = makePortfolio([makeAccount({ id: "a1", name: "My ISA", type: AccountType.ISA })]);
    const imported = makePortfolio([
      makeAccount({ id: "a2", name: "my isa", type: AccountType.ISA }, [makePosition({ id: "p2", symbol: "NEW" })]),
    ]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0].positions).toHaveLength(2);
  });

  it("preserves existing accounts when imported is empty", () => {
    const existing = makePortfolio([makeAccount({ id: "a1", name: "ISA" })]);
    const imported = makePortfolio([]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0].id).toBe("a1");
  });

  it("updates the updatedAt timestamp", () => {
    const existing = makePortfolio();
    const imported = makePortfolio([makeAccount({ id: "a2", name: "New" })]);

    const before = new Date().toISOString();
    const merged = mergePortfolios(existing, imported);
    expect(merged.updatedAt >= before).toBe(true);
  });

  it("assigns new ID to newly created accounts during merge", () => {
    const existing = makePortfolio([]);
    const imported = makePortfolio([makeAccount({ id: "original-id", name: "New Acc" })]);

    const merged = mergePortfolios(existing, imported);
    // The new account should get a fresh ID, not keep the imported one
    expect(merged.accounts[0].id).not.toBe("original-id");
  });
});

// ──────────────────────────────────────────
// findDuplicates
// ──────────────────────────────────────────

describe("findDuplicates", () => {
  it("returns empty array when no duplicates", () => {
    const existing = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);
    const imported = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "AAPL" })])]);

    const dupes = findDuplicates(existing, imported);
    expect(dupes).toHaveLength(0);
  });

  it("detects duplicate symbols in matching accounts", () => {
    const existing = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);
    const imported = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);

    const dupes = findDuplicates(existing, imported);
    expect(dupes).toHaveLength(1);
    expect(dupes[0].symbol).toBe("VUSA.L");
    expect(dupes[0].accountName).toBe("ISA");
    expect(dupes[0].existingCount).toBe(1);
  });

  it("is case-insensitive for symbol matching", () => {
    const existing = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);
    const imported = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "vusa.l" })])]);

    const dupes = findDuplicates(existing, imported);
    expect(dupes).toHaveLength(1);
  });

  it("does not flag duplicates across different accounts", () => {
    const existing = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);
    const imported = makePortfolio([
      makeAccount({ name: "GIA", type: AccountType.GIA }, [makePosition({ symbol: "VUSA.L" })]),
    ]);

    const dupes = findDuplicates(existing, imported);
    expect(dupes).toHaveLength(0);
  });

  it("counts multiple existing entries for the same symbol", () => {
    const existing = makePortfolio([
      makeAccount({ name: "ISA" }, [
        makePosition({ id: "p1", symbol: "VUSA.L" }),
        makePosition({ id: "p2", symbol: "VUSA.L" }), // duplicate in existing
      ]),
    ]);
    const imported = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);

    const dupes = findDuplicates(existing, imported);
    expect(dupes).toHaveLength(1);
    expect(dupes[0].existingCount).toBe(2);
  });

  it("returns empty when existing portfolio has no accounts", () => {
    const existing = makePortfolio([]);
    const imported = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);

    const dupes = findDuplicates(existing, imported);
    expect(dupes).toHaveLength(0);
  });
});

// ──────────────────────────────────────────
// generateExportFilename
// ──────────────────────────────────────────

describe("generateExportFilename", () => {
  it("returns a filename with the current date", () => {
    const filename = generateExportFilename();
    const today = new Date().toISOString().split("T")[0];
    expect(filename).toBe(`portfolio-export-${today}.csv`);
  });

  it("starts with 'portfolio-export-'", () => {
    expect(generateExportFilename()).toMatch(/^portfolio-export-/);
  });

  it("ends with '.csv'", () => {
    expect(generateExportFilename()).toMatch(/\.csv$/);
  });
});

// ──────────────────────────────────────────
// Round-trip: Export → Import
// ──────────────────────────────────────────

describe("round-trip: export → import", () => {
  it("exports and re-imports a simple portfolio correctly", () => {
    const portfolio = makePortfolio([
      makeAccount({ name: "ISA", type: AccountType.ISA }, [
        makePosition({
          symbol: "VUSA.L",
          name: "Vanguard S&P 500",
          units: 50,
          currency: "GBP",
          assetType: AssetType.ETF,
        }),
        makePosition({
          id: "p2",
          symbol: "VWRL.L",
          name: "Vanguard All-World",
          units: 100,
          currency: "GBP",
          assetType: AssetType.ETF,
        }),
      ]),
      makeAccount({ id: "a2", name: "Brokerage", type: AccountType.BROKERAGE }, [
        makePosition({
          id: "p3",
          symbol: "AAPL",
          name: "Apple Inc.",
          units: 10,
          currency: "USD",
          assetType: AssetType.EQUITY,
        }),
      ]),
    ]);

    const priceMap = new Map([
      ["test-pos-1", { price: 72.45, totalValue: 3622.5 }],
      ["p2", { price: 98.0, totalValue: 9800.0 }],
      ["p3", { price: 195.5, totalValue: 1955.0 }],
    ]);

    // Export
    const exportData = buildExportData(portfolio, priceMap);
    const csv = exportPortfolioToCsv(exportData);

    // Import
    const parseResult = parsePortfolioCsv(csv);
    expect(parseResult.errors).toHaveLength(0);
    expect(parseResult.rows).toHaveLength(3);

    const importResult = buildPortfolioFromCsvRows(parseResult.rows);
    expect(importResult.accountCount).toBe(2);
    expect(importResult.positionCount).toBe(3);

    // Verify data integrity
    const importedISA = importResult.portfolio.accounts.find((a) => a.name === "ISA");
    expect(importedISA).toBeDefined();
    expect(importedISA!.type).toBe(AccountType.ISA);
    expect(importedISA!.positions).toHaveLength(2);

    const vusa = importedISA!.positions.find((p) => p.symbol === "VUSA.L");
    expect(vusa).toBeDefined();
    expect(vusa!.units).toBe(50);
    expect(vusa!.currency).toBe("GBP");
    expect(vusa!.assetType).toBe(AssetType.ETF);
    // Market-traded assets should NOT get priceOverride on import — they
    // fetch live prices from Yahoo Finance so Day Change works correctly.
    expect(vusa!.priceOverride).toBeUndefined();

    const importedBrokerage = importResult.portfolio.accounts.find((a) => a.name === "Brokerage");
    expect(importedBrokerage).toBeDefined();
    expect(importedBrokerage!.type).toBe(AccountType.BROKERAGE);
    expect(importedBrokerage!.positions[0].symbol).toBe("AAPL");
    expect(importedBrokerage!.positions[0].units).toBe(10);
  });

  it("preserves custom names through export/import", () => {
    const portfolio = makePortfolio([
      makeAccount({ name: "ISA" }, [
        makePosition({ symbol: "VUSA.L", name: "Original Name", customName: "My Custom Name" }),
      ]),
    ]);

    const exportData = buildExportData(portfolio);
    const csv = exportPortfolioToCsv(exportData);

    const parseResult = parsePortfolioCsv(csv);
    expect(parseResult.rows).toHaveLength(1);
    // Custom name is used as asset name in export
    expect(parseResult.rows[0].assetName).toBe("My Custom Name");
  });

  it("skips property and debt positions on re-import", () => {
    const portfolio = makePortfolio([
      makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L", assetType: AssetType.ETF })]),
      makeAccount({ id: "a2", name: "Property", type: AccountType.PROPERTY }, [
        makePosition({ id: "p2", symbol: "PROP-1", name: "House", assetType: AssetType.MORTGAGE, units: 1 }),
      ]),
      makeAccount({ id: "a3", name: "Debt", type: AccountType.DEBT }, [
        makePosition({ id: "p3", symbol: "DEBT-1", name: "Card", assetType: AssetType.CREDIT_CARD, units: 1 }),
      ]),
    ]);

    const exportData = buildExportData(portfolio);
    const csv = exportPortfolioToCsv(exportData);

    const parseResult = parsePortfolioCsv(csv);
    expect(parseResult.rows).toHaveLength(1); // Only the ETF
    expect(parseResult.skipped).toHaveLength(2); // Property + Debt
    expect(parseResult.rows[0].symbol).toBe("VUSA.L");
  });
});

// ──────────────────────────────────────────
// Edge Cases
// ──────────────────────────────────────────

describe("CSV edge cases", () => {
  it("handles very long asset names", () => {
    const longName = "A".repeat(500);
    const csv = buildSimpleCsv([`ISA,ISA,${longName},SYM,10,100,1000,GBP,ETF,2024-01-01`]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].assetName).toBe(longName);
  });

  it("handles unicode characters in names", () => {
    const csv = buildSimpleCsv(["ISA,ISA,日本語ファンド,SYM,10,100,1000,JPY,ETF,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].assetName).toBe("日本語ファンド");
  });

  it("handles symbols with special characters", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Fund,BRK-B,10,300,3000,USD,EQUITY,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].symbol).toBe("BRK-B");
  });

  it("handles very large unit counts", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Bitcoin,BTC,0.00001234,65000,0.80,USD,CRYPTOCURRENCY,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].units).toBeCloseTo(0.00001234, 8);
  });

  it("handles very large prices", () => {
    const csv = buildSimpleCsv(["ISA,ISA,BRK-A,BRK-A,1,650000,650000,USD,EQUITY,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].price).toBe(650000);
  });

  it("handles 401K account type", () => {
    const rows: CsvRow[] = [
      {
        accountName: "My 401K",
        accountType: "401K",
        assetName: "A",
        symbol: "S1",
        units: 10,
        price: 100,
        totalValue: 1000,
        currency: "USD",
        assetType: "ETF",
        lastUpdated: "2024-01-01",
      },
    ];
    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].type).toBe(AccountType._401K);
  });

  it("handles CURRENT ACCOUNT and SAVINGS ACCOUNT types (with space)", () => {
    const rows: CsvRow[] = [
      {
        accountName: "Current",
        accountType: "CURRENT ACCOUNT",
        assetName: "Cash",
        symbol: "CASH",
        units: 5000,
        price: 1,
        totalValue: 5000,
        currency: "GBP",
        assetType: "CASH",
        lastUpdated: "2024-01-01",
      },
    ];
    const result = buildPortfolioFromCsvRows(rows);
    expect(result.portfolio.accounts[0].type).toBe(AccountType.CURRENT_ACCOUNT);
  });

  it("handles cryptocurrency positions", () => {
    const csv = buildSimpleCsv(["Crypto,CRYPTO,Bitcoin,BTC-USD,0.5,65000,32500,USD,CRYPTOCURRENCY,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].assetType).toBe("CRYPTOCURRENCY");

    const importResult = buildPortfolioFromCsvRows(result.rows);
    expect(importResult.portfolio.accounts[0].type).toBe(AccountType.CRYPTO);
    expect(importResult.portfolio.accounts[0].positions[0].assetType).toBe(AssetType.CRYPTOCURRENCY);
  });

  it("handles CASH positions", () => {
    const csv = buildSimpleCsv(["ISA,ISA,Cash (GBP),CASH-GBP,5000,1,5000,GBP,CASH,2024-01-01"]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);

    const importResult = buildPortfolioFromCsvRows(result.rows);
    expect(importResult.portfolio.accounts[0].positions[0].assetType).toBe(AssetType.CASH);
  });

  it("export handles empty account name gracefully", () => {
    const data: ExportPositionData[] = [makeExportData({ accountName: "" })];
    const csv = exportPortfolioToCsv(data);
    // Should not crash
    expect(csv).toBeTruthy();
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("merging into empty portfolio works", () => {
    const existing = makePortfolio([]);
    const imported = makePortfolio([makeAccount({ name: "ISA" }, [makePosition({ symbol: "VUSA.L" })])]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0].positions).toHaveLength(1);
  });

  it("merging with empty import preserves existing", () => {
    const existing = makePortfolio([makeAccount({ id: "a1", name: "ISA" }, [makePosition()])]);
    const imported = makePortfolio([]);

    const merged = mergePortfolios(existing, imported);
    expect(merged.accounts).toHaveLength(1);
    expect(merged.accounts[0].positions).toHaveLength(1);
  });

  it("handles minimal CSV with only required columns", () => {
    const csv = "Account,Asset Name,Symbol,Units,Currency\nISA,My Fund,FUND.L,100,GBP";
    const result = parsePortfolioCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].accountName).toBe("ISA");
    expect(result.rows[0].symbol).toBe("FUND.L");
    expect(result.rows[0].units).toBe(100);
    expect(result.rows[0].currency).toBe("GBP");
    expect(result.rows[0].price).toBe(0);
    expect(result.rows[0].assetType).toBe("UNKNOWN");
  });

  it("handles headers with extra whitespace", () => {
    const csv = " Account , Asset Name , Symbol , Units , Currency \nISA,My Fund,FUND.L,100,GBP";
    const result = parsePortfolioCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
  });

  it("handles data fields with leading/trailing whitespace", () => {
    const csv = buildSimpleCsv(["  ISA  ,ISA, My Fund ,  FUND.L  , 100 , 50 , 5000 , GBP , ETF , 2024-01-01 "]);
    const result = parsePortfolioCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].accountName).toBe("ISA");
    expect(result.rows[0].assetName).toBe("My Fund");
    expect(result.rows[0].symbol).toBe("FUND.L");
  });

  it("CSV_HEADERS has exactly 11 entries", () => {
    expect(CSV_HEADERS).toHaveLength(11);
  });
});

// ──────────────────────────────────────────
// buildAdditionalParameters
// ──────────────────────────────────────────

describe("buildAdditionalParameters", () => {
  it("returns empty string for standard positions", () => {
    const pos = makePosition();
    expect(buildAdditionalParameters(pos)).toBe("");
  });

  it("serialises mortgageData as JSON", () => {
    const pos = makePosition({
      assetType: AssetType.MORTGAGE,
      mortgageData: {
        totalPropertyValue: 350000,
        equity: 100000,
        valuationDate: "2023-06-15",
        postcode: "SW1A 1AA",
        mortgageRate: 4.5,
        mortgageTerm: 25,
        mortgageStartDate: "2020-01-15",
      },
    });
    const json = buildAdditionalParameters(pos);
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed.totalPropertyValue).toBe(350000);
    expect(parsed.equity).toBe(100000);
    expect(parsed.postcode).toBe("SW1A 1AA");
    expect(parsed.mortgageRate).toBe(4.5);
    expect(parsed.mortgageTerm).toBe(25);
    expect(parsed.mortgageStartDate).toBe("2020-01-15");
    expect(parsed.valuationDate).toBe("2023-06-15");
  });

  it("strips undefined optional mortgage fields", () => {
    const pos = makePosition({
      assetType: AssetType.MORTGAGE,
      mortgageData: {
        totalPropertyValue: 350000,
        equity: 100000,
        valuationDate: "2023-06-15",
        postcode: "SW1A 1AA",
      },
    });
    const json = buildAdditionalParameters(pos);
    const parsed = JSON.parse(json);
    expect(parsed).not.toHaveProperty("mortgageRate");
    expect(parsed).not.toHaveProperty("mortgageTerm");
    expect(parsed).not.toHaveProperty("mortgageStartDate");
    expect(parsed).not.toHaveProperty("sharedOwnershipPercent");
    expect(parsed).not.toHaveProperty("myEquityShare");
  });

  it("serialises debtData as JSON", () => {
    const pos = makePosition({
      assetType: AssetType.CREDIT_CARD,
      debtData: {
        currentBalance: 5000,
        apr: 19.9,
        repaymentDayOfMonth: 15,
        monthlyRepayment: 300,
        enteredAt: "2025-01-01T00:00:00Z",
        paidOff: false,
      },
    });
    const json = buildAdditionalParameters(pos);
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed.currentBalance).toBe(5000);
    expect(parsed.apr).toBe(19.9);
    expect(parsed.repaymentDayOfMonth).toBe(15);
    expect(parsed.monthlyRepayment).toBe(300);
    expect(parsed.enteredAt).toBe("2025-01-01T00:00:00Z");
    expect(parsed.paidOff).toBe(false);
  });

  it("strips undefined optional debt fields", () => {
    const pos = makePosition({
      assetType: AssetType.LOAN,
      debtData: {
        currentBalance: 10000,
        apr: 5,
        repaymentDayOfMonth: 1,
        monthlyRepayment: 200,
        enteredAt: "2025-01-01T00:00:00Z",
      },
    });
    const json = buildAdditionalParameters(pos);
    const parsed = JSON.parse(json);
    expect(parsed).not.toHaveProperty("loanStartDate");
    expect(parsed).not.toHaveProperty("loanEndDate");
    expect(parsed).not.toHaveProperty("totalTermMonths");
    expect(parsed).not.toHaveProperty("paidOff");
    expect(parsed).not.toHaveProperty("archived");
  });

  it("includes shared ownership fields when set", () => {
    const pos = makePosition({
      assetType: AssetType.MORTGAGE,
      mortgageData: {
        totalPropertyValue: 470000,
        equity: 47000,
        valuationDate: "2023-01-01",
        postcode: "E1 6AN",
        sharedOwnershipPercent: 60,
        myEquityShare: 40000,
      },
    });
    const json = buildAdditionalParameters(pos);
    const parsed = JSON.parse(json);
    expect(parsed.sharedOwnershipPercent).toBe(60);
    expect(parsed.myEquityShare).toBe(40000);
  });
});

// ──────────────────────────────────────────
// parseAdditionalParameters
// ──────────────────────────────────────────

describe("parseAdditionalParameters", () => {
  it("returns empty object for empty string", () => {
    const result = parseAdditionalParameters("", AssetType.MORTGAGE);
    expect(result.mortgageData).toBeUndefined();
    expect(result.debtData).toBeUndefined();
  });

  it("returns empty object for undefined", () => {
    const result = parseAdditionalParameters(undefined, AssetType.MORTGAGE);
    expect(result.mortgageData).toBeUndefined();
  });

  it("returns empty object for invalid JSON", () => {
    const result = parseAdditionalParameters("{bad json", AssetType.MORTGAGE);
    expect(result.mortgageData).toBeUndefined();
  });

  it("returns empty object for non-specialised asset types", () => {
    const json = JSON.stringify({ someField: 123 });
    const result = parseAdditionalParameters(json, AssetType.ETF);
    expect(result.mortgageData).toBeUndefined();
    expect(result.debtData).toBeUndefined();
  });

  it("parses mortgageData for MORTGAGE type", () => {
    const json = JSON.stringify({
      totalPropertyValue: 350000,
      equity: 100000,
      valuationDate: "2023-06-15",
      postcode: "SW1A 1AA",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2020-01-15",
    });
    const result = parseAdditionalParameters(json, AssetType.MORTGAGE);
    expect(result.mortgageData).toBeDefined();
    expect(result.mortgageData!.totalPropertyValue).toBe(350000);
    expect(result.mortgageData!.equity).toBe(100000);
    expect(result.mortgageData!.postcode).toBe("SW1A 1AA");
    expect(result.mortgageData!.mortgageRate).toBe(4.5);
    expect(result.mortgageData!.mortgageTerm).toBe(25);
    expect(result.mortgageData!.mortgageStartDate).toBe("2020-01-15");
    expect(result.debtData).toBeUndefined();
  });

  it("parses mortgageData for OWNED_PROPERTY type", () => {
    const json = JSON.stringify({
      totalPropertyValue: 250000,
      equity: 250000,
      valuationDate: "2024-01-01",
      postcode: "M1 1AA",
    });
    const result = parseAdditionalParameters(json, AssetType.OWNED_PROPERTY);
    expect(result.mortgageData).toBeDefined();
    expect(result.mortgageData!.totalPropertyValue).toBe(250000);
    expect(result.mortgageData!.equity).toBe(250000);
  });

  it("parses debtData for CREDIT_CARD type", () => {
    const json = JSON.stringify({
      currentBalance: 5000,
      apr: 19.9,
      repaymentDayOfMonth: 15,
      monthlyRepayment: 300,
      enteredAt: "2025-01-01T00:00:00Z",
    });
    const result = parseAdditionalParameters(json, AssetType.CREDIT_CARD);
    expect(result.debtData).toBeDefined();
    expect(result.debtData!.currentBalance).toBe(5000);
    expect(result.debtData!.apr).toBe(19.9);
    expect(result.debtData!.repaymentDayOfMonth).toBe(15);
    expect(result.debtData!.monthlyRepayment).toBe(300);
    expect(result.mortgageData).toBeUndefined();
  });

  it("parses debtData for LOAN type with loan dates", () => {
    const json = JSON.stringify({
      currentBalance: 10000,
      apr: 5,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 200,
      enteredAt: "2023-01-01T00:00:00Z",
      loanStartDate: "2023-01-01",
      loanEndDate: "2028-01-01",
      totalTermMonths: 60,
    });
    const result = parseAdditionalParameters(json, AssetType.LOAN);
    expect(result.debtData).toBeDefined();
    expect(result.debtData!.loanStartDate).toBe("2023-01-01");
    expect(result.debtData!.loanEndDate).toBe("2028-01-01");
    expect(result.debtData!.totalTermMonths).toBe(60);
  });

  it("parses paid-off and archived flags for debt", () => {
    const json = JSON.stringify({
      currentBalance: 0,
      apr: 0,
      repaymentDayOfMonth: 1,
      monthlyRepayment: 0,
      enteredAt: "2024-01-01T00:00:00Z",
      paidOff: true,
      archived: true,
    });
    const result = parseAdditionalParameters(json, AssetType.STUDENT_LOAN);
    expect(result.debtData).toBeDefined();
    expect(result.debtData!.paidOff).toBe(true);
    expect(result.debtData!.archived).toBe(true);
  });

  it("handles shared ownership mortgage fields", () => {
    const json = JSON.stringify({
      totalPropertyValue: 470000,
      equity: 47000,
      valuationDate: "2023-01-01",
      postcode: "E1 6AN",
      sharedOwnershipPercent: 60,
      myEquityShare: 40000,
    });
    const result = parseAdditionalParameters(json, AssetType.MORTGAGE);
    expect(result.mortgageData).toBeDefined();
    expect(result.mortgageData!.sharedOwnershipPercent).toBe(60);
    expect(result.mortgageData!.myEquityShare).toBe(40000);
  });

  it("round-trips mortgageData through buildAdditionalParameters → parseAdditionalParameters", () => {
    const mortgageData: MortgageData = {
      totalPropertyValue: 470000,
      equity: 47000,
      valuationDate: "2023-01-01",
      postcode: "E1 6AN",
      mortgageRate: 4.5,
      mortgageTerm: 25,
      mortgageStartDate: "2020-01-15",
      sharedOwnershipPercent: 60,
      myEquityShare: 40000,
    };
    const pos = makePosition({ assetType: AssetType.MORTGAGE, mortgageData });
    const json = buildAdditionalParameters(pos);
    const result = parseAdditionalParameters(json, AssetType.MORTGAGE);

    expect(result.mortgageData).toBeDefined();
    expect(result.mortgageData!.totalPropertyValue).toBe(470000);
    expect(result.mortgageData!.equity).toBe(47000);
    expect(result.mortgageData!.postcode).toBe("E1 6AN");
    expect(result.mortgageData!.mortgageRate).toBe(4.5);
    expect(result.mortgageData!.mortgageTerm).toBe(25);
    expect(result.mortgageData!.mortgageStartDate).toBe("2020-01-15");
    expect(result.mortgageData!.sharedOwnershipPercent).toBe(60);
    expect(result.mortgageData!.myEquityShare).toBe(40000);
  });

  it("round-trips debtData through buildAdditionalParameters → parseAdditionalParameters", () => {
    const debtData: DebtData = {
      currentBalance: 5000,
      apr: 19.9,
      repaymentDayOfMonth: 15,
      monthlyRepayment: 300,
      enteredAt: "2025-01-01T00:00:00Z",
      loanStartDate: "2024-06-01",
      loanEndDate: "2026-06-01",
      totalTermMonths: 24,
      paidOff: false,
      archived: false,
    };
    const pos = makePosition({ assetType: AssetType.CREDIT_CARD, debtData });
    const json = buildAdditionalParameters(pos);
    const result = parseAdditionalParameters(json, AssetType.CREDIT_CARD);

    expect(result.debtData).toBeDefined();
    expect(result.debtData!.currentBalance).toBe(5000);
    expect(result.debtData!.apr).toBe(19.9);
    expect(result.debtData!.repaymentDayOfMonth).toBe(15);
    expect(result.debtData!.monthlyRepayment).toBe(300);
    expect(result.debtData!.enteredAt).toBe("2025-01-01T00:00:00Z");
    expect(result.debtData!.loanStartDate).toBe("2024-06-01");
    expect(result.debtData!.loanEndDate).toBe("2026-06-01");
    expect(result.debtData!.totalTermMonths).toBe(24);
    expect(result.debtData!.paidOff).toBe(false);
    expect(result.debtData!.archived).toBe(false);
  });
});
