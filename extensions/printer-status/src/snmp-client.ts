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
  uptime: string | null;
  printerGeneralStatus: string | null;
  wasteTonerBottle: string | null;
  displayMessages: { line: number; message: string }[];
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
  // Printer-MIB uses negative values as sentinel values (for example, -2 for
  // an unknown capacity). They represent unavailable data, not a full supply.
  if (isNaN(current) || isNaN(max) || current < 0 || max <= 0) return null;

  return Math.round(Math.min(100, (current / max) * 100)).toString();
};

const formatUptime = (vb: snmp.Varbind | undefined): string | null => {
  const value = getValueString(vb);
  if (!value) return null;

  const ticks = parseInt(value, 10);
  if (isNaN(ticks)) return value;

  let seconds = Math.floor(ticks / 100);
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
};

const formatPrinterGeneralStatus = (vb: snmp.Varbind | undefined): string | null => {
  const value = getValueString(vb);
  if (!value) return null;

  const statuses: Record<string, string> = {
    "1": "other",
    "2": "unknown",
    "3": "idle",
    "4": "printing",
    "5": "warmup",
  };

  return statuses[value] || value;
};

const formatWasteTonerBottleUsed = (
  currentVb: snmp.Varbind | undefined,
  maxVb: snmp.Varbind | undefined,
): string | null => {
  const capacity = Number(getValueString(maxVb));
  if (!Number.isFinite(capacity) || capacity <= 0) return null;

  const freePercentage = calculatePercentage(currentVb, maxVb);
  if (freePercentage == null) return null;

  const usedPercentage = Math.min(100, Math.max(0, 100 - parseInt(freePercentage, 10)));
  return `${usedPercentage}% used`;
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

const openPrinterSession = async (host: string, community: string, pageCountOid: string) => {
  let lastError: unknown;

  // Probe before starting optional requests so they all use a supported version.
  for (const version of [snmp.Version2c, snmp.Version1]) {
    const session = snmp.createSession(host, community, { version, timeout: 5000, retries: 1 });
    try {
      const pageVarbinds = await getOids(session, [pageCountOid]);
      return { session, pageVarbinds };
    } catch (error) {
      session.close();
      lastError = error;
    }
  }

  throw lastError;
};

const getOptionalOid = async (session: snmp.Session, oid: string): Promise<snmp.Varbind | undefined> => {
  try {
    return (await getOids(session, [oid]))[0];
  } catch {
    return undefined;
  }
};

const getOptionalOids = (session: snmp.Session, oids: string[]): Promise<(snmp.Varbind | undefined)[]> =>
  Promise.all(oids.map((oid) => getOptionalOid(session, oid)));

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

    const [maxVb, currentVb] = await getOptionalOids(session, [
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
  const { session, pageVarbinds } = await openPrinterSession(host, community, oidConfig.totalPagesOid);
  const optionalPageOids = [oidConfig.blackPagesOid, oidConfig.colorPagesOid].filter(Boolean);
  const generalOidsList = [
    oidConfig.modelNameOid,
    oidConfig.serialNumberOid,
    oidConfig.printerNameOid,
    oidConfig.wasteTonerBottleOid,
    oidConfig.wasteTonerBottleMaxCapacityOid,
    oidConfig.uptimeOid,
    oidConfig.printerGeneralStatusOid,
    oidConfig.displayMessage1Oid,
    oidConfig.displayMessage2Oid,
    oidConfig.displayMessage3Oid,
    oidConfig.displayMessage4Oid,
  ];

  try {
    const [optionalPageVarbinds, generalVarbinds, tonerLevels] = await Promise.all([
      getOptionalOids(session, optionalPageOids),
      getOptionalOids(session, generalOidsList),
      fetchTonerLevels(session, oidConfig).catch(() => ({
        blackInkLevel: null,
        cyanInkLevel: null,
        magentaInkLevel: null,
        yellowInkLevel: null,
      })),
    ]);

    return {
      pageCount: getValueString(pageVarbinds[0]),
      blackPageCount: oidConfig.blackPagesOid ? getValueString(optionalPageVarbinds[0]) : null,
      colorPageCount: oidConfig.colorPagesOid
        ? getValueString(optionalPageVarbinds[oidConfig.blackPagesOid ? 1 : 0])
        : null,
      ...tonerLevels,
      modelName: getValueString(generalVarbinds[0]),
      serialNumber: getValueString(generalVarbinds[1]),
      printerName: getValueString(generalVarbinds[2]),
      wasteTonerBottle: formatWasteTonerBottleUsed(generalVarbinds[3], generalVarbinds[4]),
      uptime: formatUptime(generalVarbinds[5]),
      printerGeneralStatus: formatPrinterGeneralStatus(generalVarbinds[6]),
      printerStatus: formatPrinterGeneralStatus(generalVarbinds[6]),
      displayMessages: generalVarbinds
        .slice(7, 11)
        .map((vb, index) => ({ line: index + 1, message: getValueString(vb)?.trim() }))
        .filter((entry): entry is { line: number; message: string } => Boolean(entry.message)),
    };
  } finally {
    session.close();
  }
}
