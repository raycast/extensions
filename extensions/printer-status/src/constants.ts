export const OIDS = {
  // Page Counts
  TOTAL_PAGES: "1.3.6.1.4.1.253.8.53.13.2.1.6.1.20.1",
  BLACK_PAGES: "1.3.6.1.4.1.253.8.53.13.2.1.6.1.20.34",
  COLOR_PAGES: "1.3.6.1.4.1.253.8.53.13.2.1.6.1.20.33",

  // Ink Levels (Current)
  INK_BLACK_CURRENT: "1.3.6.1.2.1.43.11.1.1.9.1.1",
  INK_YELLOW_CURRENT: "1.3.6.1.2.1.43.11.1.1.9.1.2",
  INK_MAGENTA_CURRENT: "1.3.6.1.2.1.43.11.1.1.9.1.3",
  INK_CYAN_CURRENT: "1.3.6.1.2.1.43.11.1.1.9.1.4",

  // Ink Levels (Max)
  INK_BLACK_MAX: "1.3.6.1.2.1.43.11.1.1.8.1.1",
  INK_YELLOW_MAX: "1.3.6.1.2.1.43.11.1.1.8.1.2",
  INK_MAGENTA_MAX: "1.3.6.1.2.1.43.11.1.1.8.1.3",
  INK_CYAN_MAX: "1.3.6.1.2.1.43.11.1.1.8.1.4",

  // General Info
  MODEL_NAME: "1.3.6.1.2.1.1.1.0",
  SERIAL_NUMBER: "1.3.6.1.2.1.43.5.1.1.17.1",
  PRINTER_NAME: "1.3.6.1.2.1.1.5.0",

  // Status (Console Display)
  CONSOLE_DISPLAY: "1.3.6.1.2.1.43.16.5.1.2.1.1",
} as const;

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
