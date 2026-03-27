import snmp from "net-snmp";
import { OIDS } from "./constants";

export interface PrinterStats {
  pageCount: string | null;
  blackPageCount: string | null;
  colorPageCount: string | null;
  blackInkLevel: string | null;
  cyanInkLevel: string | null;
  magentaInkLevel: string | null;
  yellowInkLevel: string | null;
  modelName: string | null;
  serialNumber: string | null;
  printerName: string | null;
  printerStatus: string | null;
}

const getValueString = (vb: snmp.Varbind): string | null => {
  if (snmp.isVarbindError(vb) || vb.value == null) return null;
  return vb.value.toString();
};

const calculatePercentage = (currentVb: snmp.Varbind, maxVb: snmp.Varbind): string | null => {
  if (snmp.isVarbindError(currentVb) || snmp.isVarbindError(maxVb)) return null;
  const currentStr = getValueString(currentVb);
  const maxStr = getValueString(maxVb);
  if (currentStr == null || maxStr == null) return null;
  const current = parseInt(currentStr, 10);
  const max = parseInt(maxStr, 10);
  if (isNaN(current) || isNaN(max)) return null;
  if (max > 0) {
    return Math.round((current / max) * 100).toString();
  }
  // When max is 0 or invalid, return 0% rather than a huge raw value
  return "0";
};

export async function fetchPrinterStats(host: string, community: string = "public"): Promise<PrinterStats> {
  return new Promise((resolve, reject) => {
    // Add sensible timeout and retry options to avoid hanging or extremely long waits
    const session = snmp.createSession(host, community, { timeout: 5000, retries: 1 });
    const oidsList = [
      OIDS.TOTAL_PAGES,
      OIDS.BLACK_PAGES,
      OIDS.COLOR_PAGES,
      OIDS.INK_BLACK_CURRENT,
      OIDS.INK_BLACK_MAX,
      OIDS.INK_CYAN_CURRENT,
      OIDS.INK_CYAN_MAX,
      OIDS.INK_MAGENTA_CURRENT,
      OIDS.INK_MAGENTA_MAX,
      OIDS.INK_YELLOW_CURRENT,
      OIDS.INK_YELLOW_MAX,
      OIDS.MODEL_NAME,
      OIDS.SERIAL_NUMBER,
      OIDS.PRINTER_NAME,
      OIDS.CONSOLE_DISPLAY,
    ];

    session.get(oidsList, (error, varbinds) => {
      if (error) {
        session.close();
        reject(error);
        return;
      }

      if (!varbinds) {
        session.close();
        reject(new Error("No varbinds returned"));
        return;
      }

      const stats: PrinterStats = {
        pageCount: getValueString(varbinds[0]),
        blackPageCount: getValueString(varbinds[1]),
        colorPageCount: getValueString(varbinds[2]),
        blackInkLevel: calculatePercentage(varbinds[3], varbinds[4]),
        cyanInkLevel: calculatePercentage(varbinds[5], varbinds[6]),
        magentaInkLevel: calculatePercentage(varbinds[7], varbinds[8]),
        yellowInkLevel: calculatePercentage(varbinds[9], varbinds[10]),
        modelName: getValueString(varbinds[11]),
        serialNumber: getValueString(varbinds[12]),
        printerName: getValueString(varbinds[13]),
        printerStatus: getValueString(varbinds[14]),
      };

      session.close();
      resolve(stats);
    });
  });
}
