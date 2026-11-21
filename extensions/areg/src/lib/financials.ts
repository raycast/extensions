// Generated from https://areg.no/data-model.md (FinancialYearResponse).

export type FinancialLine = { key: string; label: string; total?: boolean };
export type FinancialGroup = { key: string; label: string; lines: FinancialLine[] };

export const FINANCIAL_GROUPS: FinancialGroup[] = [
  {
    key: "incomeStatement",
    label: "Income statement",
    lines: [
      { key: "salesRevenue", label: "Net sales revenue" },
      { key: "otherOperatingIncome", label: "Other operating income" },
      { key: "operatingRevenue", label: "Total operating income (revenue)", total: true },
      { key: "payrollExpenses", label: "Payroll expenses" },
      { key: "wages", label: "Of which wages and salaries only" },
      { key: "depreciation", label: "Ordinary depreciation" },
      { key: "otherOperatingExpenses", label: "Other operating expenses" },
      { key: "operatingExpenses", label: "Total operating expenses", total: true },
      { key: "operatingResult", label: "Operating result (EBIT)", total: true },
      { key: "ebitda", label: "Earnings before interest, tax, depreciation, amortisation" },
      { key: "financialIncome", label: "Total financial income" },
      { key: "financialExpenses", label: "Total financial expenses" },
      { key: "netFinancialItems", label: "Net financial items", total: true },
      { key: "profitBeforeTax", label: "Profit before tax", total: true },
      { key: "taxExpense", label: "Tax expense" },
      { key: "ordinaryResult", label: "Ordinary result after tax" },
      { key: "netIncome", label: "Net income for the year", total: true },
      { key: "groupContribution", label: "Group contribution" },
    ],
  },
  {
    key: "assets",
    label: "Assets",
    lines: [
      { key: "goodwill", label: "Goodwill" },
      { key: "intangibleAssets", label: "Total intangible assets" },
      { key: "landAndBuildings", label: "Land and buildings" },
      { key: "machineryAndEquipment", label: "Machinery, fixtures and equipment" },
      { key: "tangibleFixedAssets", label: "Total tangible fixed assets" },
      { key: "sharesInSubsidiaries", label: "Shares in subsidiaries" },
      { key: "investmentsInShares", label: "Investments in shares" },
      { key: "otherFinancialReceivables", label: "Other financial receivables" },
      { key: "financialFixedAssets", label: "Total financial fixed assets" },
      { key: "nonCurrentAssets", label: "Total non-current (fixed) assets", total: true },
      { key: "tradeReceivables", label: "Trade receivables" },
      { key: "otherReceivables", label: "Other receivables" },
      { key: "groupReceivables", label: "Group (intra-group) receivables" },
      { key: "totalReceivables", label: "Total receivables" },
      { key: "cashAndDeposits", label: "Cash and bank deposits" },
      { key: "currentAssets", label: "Total current assets", total: true },
      { key: "totalAssets", label: "Total assets", total: true },
    ],
  },
  {
    key: "equityAndLiabilities",
    label: "Equity and liabilities",
    lines: [
      { key: "shareCapital", label: "Share capital" },
      { key: "otherPaidInEquity", label: "Other paid-in equity" },
      { key: "paidInEquity", label: "Total paid-in equity" },
      { key: "retainedEarnings", label: "Retained earnings" },
      { key: "totalEquity", label: "Total equity", total: true },
      { key: "provisions", label: "Provisions for liabilities" },
      { key: "otherLongTermLiabilities", label: "Other long-term liabilities" },
      {
        key: "nonCurrentLiabilities",
        label: "Total non-current (long-term) liabilities",
        total: true,
      },
      { key: "accountsPayable", label: "Accounts (trade) payable" },
      { key: "publicDutiesPayable", label: "Public duties payable" },
      { key: "otherCurrentLiabilities", label: "Other current liabilities" },
      {
        key: "currentLiabilities",
        label: "Total current (short-term) liabilities",
        total: true,
      },
      { key: "totalLiabilities", label: "Total liabilities", total: true },
    ],
  },
  {
    key: "executive",
    label: "Executive pay",
    lines: [
      { key: "executiveSalary", label: "Executive (CEO) salary" },
      { key: "executiveOtherRemuneration", label: "Executive other remuneration" },
    ],
  },
];
