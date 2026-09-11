import { Toast, environment, showToast } from "@raycast/api";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import { DATA_VERSION, GaffiotConverter, IndexRow, JsonArraySplitter, RawEntry } from "./convert";
import { GAFFIOT_JSON_RAW_URL } from "./legal";

/**
 * Les données du Gaffiot ne sont pas livrées avec l'extension (CC BY-NC-ND 4.0) :
 * au premier lancement, le fichier source est téléchargé depuis Gaffiot/digital-gaffiot-json
 * puis converti localement dans le dossier de support de l'extension.
 */
export const IDX_PATH = join(environment.supportPath, "gaffiot.idx.json");
export const DAT_PATH = join(environment.supportPath, "gaffiot.dat");
const META_PATH = join(environment.supportPath, "gaffiot.meta.json");

interface Meta {
  version: number;
  source: string;
  installedAt: string;
}

/** Données présentes et produites par la version actuelle du convertisseur. */
export function isDataReady(): boolean {
  if (!existsSync(IDX_PATH) || !existsSync(DAT_PATH)) return false;
  try {
    const meta = JSON.parse(readFileSync(META_PATH, "utf8")) as Meta;
    return meta.version === DATA_VERSION && meta.source === GAFFIOT_JSON_RAW_URL;
  } catch {
    return false;
  }
}

let pending: Promise<true> | undefined;

/** Installe les données si besoin ; les appels concurrents partagent le même téléchargement. */
export function ensureData(): Promise<true> {
  if (isDataReady()) return Promise.resolve(true);
  pending ??= install().finally(() => {
    pending = undefined;
  });
  return pending;
}

async function install(): Promise<true> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading the Gaffiot" });
  const tmpDat = `${DAT_PATH}.tmp`;
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    const index = await downloadAndConvert(GAFFIOT_JSON_RAW_URL, tmpDat, (mb) => {
      toast.message = `${mb.toFixed(1)} MB`;
    });

    renameSync(tmpDat, DAT_PATH);
    writeAtomic(IDX_PATH, JSON.stringify(index));
    const meta: Meta = { version: DATA_VERSION, source: GAFFIOT_JSON_RAW_URL, installedAt: new Date().toISOString() };
    writeAtomic(META_PATH, JSON.stringify(meta));

    toast.style = Toast.Style.Success;
    toast.title = "Gaffiot ready";
    toast.message = `${index.length.toLocaleString("en-US")} entries, available offline`;
    return true;
  } catch (error) {
    rmSync(tmpDat, { force: true });
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't download the Gaffiot";
    toast.message = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

/**
 * Télécharge gaffiot.json et le convertit au fil de l'eau : chaque article est écrit dans
 * `datPath` dès qu'il est reçu, seul l'index (≈ 3 Mo) reste en mémoire.
 */
async function downloadAndConvert(
  url: string,
  datPath: string,
  onProgress: (megabytes: number) => void,
): Promise<IndexRow[]> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const splitter = new JsonArraySplitter();
  const converter = new GaffiotConverter();
  const fd = openSync(datPath, "w");
  const onEntry = (json: string) => writeSync(fd, converter.add(JSON.parse(json) as RawEntry));
  try {
    let received = 0;
    let reported = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      splitter.push(decoder.decode(value, { stream: true }), onEntry);
      received += value.length;
      if (received - reported >= 1e6) {
        reported = received;
        onProgress(received / 1e6);
      }
    }
    splitter.push(decoder.decode(), onEntry);
  } finally {
    closeSync(fd);
  }

  if (splitter.incomplete || converter.index.length === 0) throw new Error("Incomplete download");
  return converter.index;
}

/** Écrit dans un fichier temporaire puis renomme, pour ne jamais laisser un fichier tronqué. */
function writeAtomic(path: string, content: string) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}
