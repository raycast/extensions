import { getPreferenceValues } from "@raycast/api";

export const PID_KEY = "scannerPid";

type ScannerOptions = Pick<Preferences, "suffix" | "gsSeparator" | "gsReplacement" | "camera"> & {
  symbologies: string[];
  dedupeSeconds: number;
  timeoutSeconds?: number;
};

// The options JSON for the Swift helper, from the preferences.
export function buildOptions(extra: { timeoutSeconds?: number } = {}): string {
  const prefs = getPreferenceValues<Preferences>();
  const groups: [boolean, string[]][] = [
    [prefs.codesQr, ["qr", "microQR"]],
    [prefs.codesDataMatrix, ["dataMatrix"]],
    [prefs.codesAztec, ["aztec"]],
    [prefs.codesPdf417, ["pdf417", "microPDF417"]],
    [prefs.codes1d, ["code128", "code39", "code93", "ean8", "ean13", "upce", "itf14", "i2of5", "codabar"]],
    [prefs.codesGs1DataBar, ["gs1DataBar"]],
  ];
  const options: ScannerOptions = {
    suffix: prefs.suffix,
    gsSeparator: prefs.gsSeparator,
    gsReplacement: prefs.gsReplacement,
    camera: prefs.camera,
    symbologies: groups.flatMap(([enabled, ids]) => (enabled ? ids : [])),
    dedupeSeconds: Number(prefs.dedupeSeconds),
    ...extra,
  };
  return JSON.stringify(options);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
