export const MINIMUM_PROMPTTY_VERSION = "1.4.0";

export function isPrompttyVersionSupported(version: string): boolean {
  const installedComponents = parseVersion(version);
  const minimumComponents = parseVersion(MINIMUM_PROMPTTY_VERSION);
  if (!installedComponents || !minimumComponents) return false;

  const componentCount = Math.max(installedComponents.length, minimumComponents.length);
  for (let index = 0; index < componentCount; index += 1) {
    const installed = installedComponents[index] ?? 0;
    const minimum = minimumComponents[index] ?? 0;
    if (installed !== minimum) return installed > minimum;
  }
  return true;
}

function parseVersion(version: string): number[] | undefined {
  if (!/^\d+(?:\.\d+)*$/u.test(version)) return undefined;
  return version.split(".").map(Number);
}
