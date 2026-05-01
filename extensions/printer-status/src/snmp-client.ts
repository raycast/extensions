import snmp from "net-snmp";
import { DEFAULT_OIDS, OidConfig } from "./constants";

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

const MAX_SUPPLY_ROWS = 40;

const getValueString = (vb: snmp.Varbind | undefined): string | null => {
  if (!vb || snmp.isVarbindError(vb) || vb.value == null) return null;
  return vb.value.toString();
};

const calculatePercentage = (currentVb: snmp.Varbind | undefined, maxVb: snmp.Varbind | undefined): string | null => {
  if (!currentVb || !maxVb || snmp.isVarbindError(currentVb) || snmp.isVarbindError(maxVb)) return null;
  const currentStr = getValueString(currentVb);
  const maxStr = getValueString(maxVb);
  if (currentStr == null || maxStr == null) return null;
  const current = parseInt(currentStr, 10);
  const max = parseInt(maxStr, 10);
  if (isNaN(current) || isNaN(max)) return null;
  if (current < 0) return null;
  if (max > 0) {
    return Math.round((current / max) * 100).toString();
  }
  if (current <= 100) return current.toString();
  return null;
};

const getOids = (session: snmp.Session, oids: string[]): Promise<snmp.Varbind[]> =>
  new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(varbinds || []);
    });
  });

const getNextOid = (session: snmp.Session, oid: string): Promise<snmp.Varbind | undefined> =>
  new Promise((resolve, reject) => {
    session.getNext([oid], (error, varbinds) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(varbinds?.[0]);
    });
  });

const isInSubtree = (oid: string | undefined, baseOid: string): oid is string => {
  return Boolean(oid && oid.startsWith(`${baseOid}.`));
};

const getSupplyIndex = (oid: string, baseOid: string): string => oid.slice(baseOid.length + 1);

const getSupplyColor = (description: string): "black" | "cyan" | "magenta" | "yellow" | null => {
  const normalized = description.toLowerCase();

  if (/\b(black|noir)\b/.test(normalized)) return "black";
  if (/\bcyan\b/.test(normalized)) return "cyan";
  if (/\bmagenta\b/.test(normalized)) return "magenta";
  if (/\b(yellow|jaune)\b/.test(normalized)) return "yellow";
  return null;
};

const getSupplyScore = (description: string): number => {
  const normalized = description.toLowerCase();
  let score = 0;

  if (/(toner|cartridge|cartouche)/.test(normalized)) score += 2;
  if (/(imaging|kit|fuser|waste|drum|transfer)/.test(normalized)) score -= 2;

  return score;
};

const fetchTonerLevels = async (
  session: snmp.Session,
  oids: OidConfig,
): Promise<Pick<PrinterStats, "blackInkLevel" | "cyanInkLevel" | "magentaInkLevel" | "yellowInkLevel">> => {
  const supplies: { description: string; index: string; score: number }[] = [];
  let cursor = oids.supplyDescriptionBaseOid;

  for (let row = 0; row < MAX_SUPPLY_ROWS; row++) {
    const vb = await getNextOid(session, cursor);
    if (!isInSubtree(vb?.oid, oids.supplyDescriptionBaseOid)) break;

    const description = getValueString(vb);
    if (description) {
      supplies.push({
        description,
        index: getSupplyIndex(vb.oid, oids.supplyDescriptionBaseOid),
        score: getSupplyScore(description),
      });
    }

    cursor = vb.oid;
  }

  const selected = new Map<"black" | "cyan" | "magenta" | "yellow", { index: string; score: number }>();

  for (const supply of supplies) {
    const color = getSupplyColor(supply.description);
    if (!color) continue;

    const current = selected.get(color);
    if (!current || supply.score > current.score) {
      selected.set(color, { index: supply.index, score: supply.score });
    }
  }

  const fetchLevel = async (index: string | undefined): Promise<string | null> => {
    if (!index) return null;

    const [maxVb, currentVb] = await getOids(session, [
      `${oids.supplyMaxCapacityBaseOid}.${index}`,
      `${oids.supplyLevelBaseOid}.${index}`,
    ]);

    return calculatePercentage(currentVb, maxVb);
  };

  const [blackInkLevel, cyanInkLevel, magentaInkLevel, yellowInkLevel] = await Promise.all([
    fetchLevel(selected.get("black")?.index),
    fetchLevel(selected.get("cyan")?.index),
    fetchLevel(selected.get("magenta")?.index),
    fetchLevel(selected.get("yellow")?.index),
  ]);

  return { blackInkLevel, cyanInkLevel, magentaInkLevel, yellowInkLevel };
};

export async function fetchPrinterStats(
  host: string,
  community: string = "public",
  oidConfig: OidConfig = DEFAULT_OIDS,
): Promise<PrinterStats> {
  const session = snmp.createSession(host, community, { timeout: 5000, retries: 1 });
  const optionalPageOids = [oidConfig.blackPagesOid, oidConfig.colorPagesOid].filter(Boolean);
  const oidsList = [oidConfig.totalPagesOid, ...optionalPageOids];
  const generalOidsList = [
    oidConfig.modelNameOid,
    oidConfig.serialNumberOid,
    oidConfig.printerNameOid,
    oidConfig.printerStatusOid,
  ];

  try {
    const pageVarbinds = await getOids(session, oidsList);
    const generalVarbinds = await getOids(session, generalOidsList);
    const tonerLevels = await fetchTonerLevels(session, oidConfig);

    return {
      pageCount: getValueString(pageVarbinds[0]),
      blackPageCount: oidConfig.blackPagesOid ? getValueString(pageVarbinds[1]) : null,
      colorPageCount: oidConfig.colorPagesOid ? getValueString(pageVarbinds[oidConfig.blackPagesOid ? 2 : 1]) : null,
      ...tonerLevels,
      modelName: getValueString(generalVarbinds[0]),
      serialNumber: getValueString(generalVarbinds[1]),
      printerName: getValueString(generalVarbinds[2]),
      printerStatus: getValueString(generalVarbinds[3]),
    };
  } finally {
    session.close();
  }
}
