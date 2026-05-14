export interface OidConfig {
  totalPagesOid: string;
  blackPagesOid: string;
  colorPagesOid: string;
  supplyDescriptionBaseOid: string;
  supplyMaxCapacityBaseOid: string;
  supplyLevelBaseOid: string;
  modelNameOid: string;
  serialNumberOid: string;
  printerNameOid: string;
  printerStatusOid: string;
}

export const DEFAULT_OIDS: OidConfig = {
  // Page Counts
  totalPagesOid: "1.3.6.1.2.1.43.10.2.1.4.1.1",
  blackPagesOid: "1.3.6.1.4.1.253.8.53.13.2.1.6.1.20.34",
  colorPagesOid: "1.3.6.1.4.1.253.8.53.13.2.1.6.1.20.33",

  // Printer-MIB supply table. Xerox C325 exposes toner cartridges here, but
  // indexes can vary, so the code discovers entries by their descriptions.
  supplyDescriptionBaseOid: "1.3.6.1.2.1.43.11.1.1.6",
  supplyMaxCapacityBaseOid: "1.3.6.1.2.1.43.11.1.1.8",
  supplyLevelBaseOid: "1.3.6.1.2.1.43.11.1.1.9",

  // General Info
  modelNameOid: "1.3.6.1.2.1.1.1.0",
  serialNumberOid: "1.3.6.1.2.1.43.5.1.1.17.1",
  printerNameOid: "1.3.6.1.2.1.1.5.0",

  // Status (Console Display)
  printerStatusOid: "1.3.6.1.2.1.43.16.5.1.2.1.1",
};

export const getOidConfig = (preferences: Partial<OidConfig>): OidConfig => ({
  totalPagesOid: preferences.totalPagesOid || DEFAULT_OIDS.totalPagesOid,
  blackPagesOid: preferences.blackPagesOid || DEFAULT_OIDS.blackPagesOid,
  colorPagesOid: preferences.colorPagesOid || DEFAULT_OIDS.colorPagesOid,
  supplyDescriptionBaseOid: preferences.supplyDescriptionBaseOid || DEFAULT_OIDS.supplyDescriptionBaseOid,
  supplyMaxCapacityBaseOid: preferences.supplyMaxCapacityBaseOid || DEFAULT_OIDS.supplyMaxCapacityBaseOid,
  supplyLevelBaseOid: preferences.supplyLevelBaseOid || DEFAULT_OIDS.supplyLevelBaseOid,
  modelNameOid: preferences.modelNameOid || DEFAULT_OIDS.modelNameOid,
  serialNumberOid: preferences.serialNumberOid || DEFAULT_OIDS.serialNumberOid,
  printerNameOid: preferences.printerNameOid || DEFAULT_OIDS.printerNameOid,
  printerStatusOid: preferences.printerStatusOid || DEFAULT_OIDS.printerStatusOid,
});

export const INK_COLORS = {
  BLACK: "black",
  CYAN: "cyan",
  MAGENTA: "magenta",
  YELLOW: "yellow",
} as const;

export const LABELS = {
  sectionGeneral: "General Information",
  status: "Status",
  copyStatus: "Copy Status",
  ipAddress: "IP Address",
  copyIp: "Copy IP",
  networkName: "Network Name",
  copyName: "Copy Name",
  model: "Model",
  copyModel: "Copy Model",
  serialNumber: "Serial Number",
  copySerial: "Copy Serial Number",
  sectionPageCounts: "Page Counts",
  total: "Total",
  copyTotal: "Copy Total",
  blackWhite: "Black & White",
  copyTotalBlack: "Copy Total Black",
  color: "Color",
  copyTotalColor: "Copy Total Color",
  sectionInkLevels: "Ink Levels",
  black: "Black",
  copyBlackLevel: "Copy Black Level",
  cyan: "Cyan",
  copyCyanLevel: "Copy Cyan Level",
  magenta: "Magenta",
  copyMagentaLevel: "Copy Magenta Level",
  yellow: "Yellow",
  copyYellowLevel: "Copy Yellow Level",
  pages: "pages",
} as const;
