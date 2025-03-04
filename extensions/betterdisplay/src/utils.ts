export function parseResolutionList(output: string): ResolutionOption[] {
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  const options: ResolutionOption[] = [];
  for (const line of lines) {
    // Example line:
    // "20 - 3440x1440 HiDPI 50Hz 10bpc Current Default Native"
    const parts = line.split(" - ");
    if (parts.length < 2) continue;
    const modeNumber = parts[0].trim();
    const details = parts[1].trim();
    const tokens = details.split(/\s+/);
    if (tokens.length < 3) continue;
    const resolution = tokens[0];
    let hiDPI = false;
    let index = 1;
    if (tokens[index] === "HiDPI") {
      hiDPI = true;
      index++;
    }
    const refreshRate = tokens[index] || "";
    const bpc = tokens[index + 1] || "";
    const isDefault = tokens.includes("Default");
    const native = tokens.includes("Native");
    const unsafe = tokens.includes("Unsafe");
    const current = tokens.includes("Current");
    options.push({
      modeNumber,
      resolution,
      hiDPI,
      refreshRate,
      bpc,
      isDefault,
      native,
      unsafe,
      current,
    });
  }
  return options;
}

export type ResolutionOption = {
  modeNumber: string; // The index number (e.g., "20")
  resolution: string; // e.g., "3440x1440"
  hiDPI: boolean;
  refreshRate: string; // e.g., "50Hz"
  bpc: string; // e.g., "10bpc"
  isDefault: boolean;
  native: boolean;
  unsafe: boolean;
  current: boolean;
};
