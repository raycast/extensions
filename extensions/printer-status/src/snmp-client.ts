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

const calculatePercentage = (currentVb: snmp.Varbind, maxVb: snmp.Varbind): string | null => {
  if (snmp.isVarbindError(currentVb) || snmp.isVarbindError(maxVb)) return null;
  const current = parseInt(currentVb.value.toString(), 10);
  const max = parseInt(maxVb.value.toString(), 10);
  if (max > 0) {
    return Math.round((current / max) * 100).toString();
  }
  return current.toString();
};

export async function fetchPrinterStats(host: string): Promise<PrinterStats> {
  return new Promise((resolve, reject) => {
    const session = snmp.createSession(host, "public");
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

      const stats: PrinterStats = {
        pageCount: !snmp.isVarbindError(varbinds[0]) ? varbinds[0].value.toString() : null,
        blackPageCount: !snmp.isVarbindError(varbinds[1]) ? varbinds[1].value.toString() : null,
        colorPageCount: !snmp.isVarbindError(varbinds[2]) ? varbinds[2].value.toString() : null,
        blackInkLevel: calculatePercentage(varbinds[3], varbinds[4]),
        cyanInkLevel: calculatePercentage(varbinds[5], varbinds[6]),
        magentaInkLevel: calculatePercentage(varbinds[7], varbinds[8]),
        yellowInkLevel: calculatePercentage(varbinds[9], varbinds[10]),
        modelName: !snmp.isVarbindError(varbinds[11]) ? varbinds[11].value.toString() : null,
        serialNumber: !snmp.isVarbindError(varbinds[12]) ? varbinds[12].value.toString() : null,
        printerName: !snmp.isVarbindError(varbinds[13]) ? varbinds[13].value.toString() : null,
        printerStatus: !snmp.isVarbindError(varbinds[14]) ? varbinds[14].value.toString() : null,
      };

      session.close();
      resolve(stats);
    });
  });
}
