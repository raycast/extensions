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
  wasteTonerBottleOid: string;
  wasteTonerBottleMaxCapacityOid: string;
  uptimeOid: string;
  printerGeneralStatusOid: string;
  displayMessage1Oid: string;
  displayMessage2Oid: string;
  displayMessage3Oid: string;
  displayMessage4Oid: string;
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

  // Status
  wasteTonerBottleOid: "1.3.6.1.2.1.43.11.1.1.9.1.10",
  wasteTonerBottleMaxCapacityOid: "1.3.6.1.2.1.43.11.1.1.8.1.10",
  uptimeOid: "1.3.6.1.2.1.1.3.0",
  printerGeneralStatusOid: "1.3.6.1.2.1.25.3.5.1.1.1",
  displayMessage1Oid: "1.3.6.1.2.1.43.16.5.1.2.1.1",
  displayMessage2Oid: "1.3.6.1.2.1.43.16.5.1.2.1.2",
  displayMessage3Oid: "1.3.6.1.2.1.43.16.5.1.2.1.3",
  displayMessage4Oid: "1.3.6.1.2.1.43.16.5.1.2.1.4",
};

export interface RawOidPreferences extends Partial<OidConfig> {
  /** Preference key retained for existing custom display-line-1 OIDs. */
  printerStatusOid?: string;
}

export const getOidConfig = (preferences: RawOidPreferences): OidConfig => ({
  totalPagesOid: preferences.totalPagesOid || DEFAULT_OIDS.totalPagesOid,
  blackPagesOid: preferences.blackPagesOid || DEFAULT_OIDS.blackPagesOid,
  colorPagesOid: preferences.colorPagesOid || DEFAULT_OIDS.colorPagesOid,
  supplyDescriptionBaseOid: preferences.supplyDescriptionBaseOid || DEFAULT_OIDS.supplyDescriptionBaseOid,
  supplyMaxCapacityBaseOid: preferences.supplyMaxCapacityBaseOid || DEFAULT_OIDS.supplyMaxCapacityBaseOid,
  supplyLevelBaseOid: preferences.supplyLevelBaseOid || DEFAULT_OIDS.supplyLevelBaseOid,
  modelNameOid: preferences.modelNameOid || DEFAULT_OIDS.modelNameOid,
  serialNumberOid: preferences.serialNumberOid || DEFAULT_OIDS.serialNumberOid,
  printerNameOid: preferences.printerNameOid || DEFAULT_OIDS.printerNameOid,
  wasteTonerBottleOid: preferences.wasteTonerBottleOid || DEFAULT_OIDS.wasteTonerBottleOid,
  wasteTonerBottleMaxCapacityOid:
    preferences.wasteTonerBottleMaxCapacityOid || DEFAULT_OIDS.wasteTonerBottleMaxCapacityOid,
  uptimeOid: preferences.uptimeOid || DEFAULT_OIDS.uptimeOid,
  printerGeneralStatusOid: preferences.printerGeneralStatusOid || DEFAULT_OIDS.printerGeneralStatusOid,
  displayMessage1Oid: preferences.printerStatusOid || DEFAULT_OIDS.displayMessage1Oid,
  displayMessage2Oid: preferences.displayMessage2Oid || DEFAULT_OIDS.displayMessage2Oid,
  displayMessage3Oid: preferences.displayMessage3Oid || DEFAULT_OIDS.displayMessage3Oid,
  displayMessage4Oid: preferences.displayMessage4Oid || DEFAULT_OIDS.displayMessage4Oid,
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
  uptime: "Uptime",
  copyUptime: "Copy Uptime",
  model: "Model",
  copyModel: "Copy Model",
  serialNumber: "Serial Number",
  copySerial: "Copy Serial Number",
  sectionStatus: "Status",
  generalStatus: "General Status",
  copyGeneralStatus: "Copy General Status",
  wasteTonerBottle: "Waste Toner Bottle",
  copyWasteTonerBottle: "Copy Waste Toner Bottle Level",
  displayMessage: "Display Message",
  copyDisplayMessage: "Copy Display Message",
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
