import { execute } from "./exec";

export enum MacOSVersion {
  BigSur = 11,
  Monterey = 12,
  Ventura = 13,
  Sonoma = 14,
  Sequoia = 15,
}

type Semver = {
  major: number;
  minor: number;
  patch: number;
};

let cachedVersion: Semver | undefined;

export async function getMacosVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  const output = await execute("sw_vers", "-productVersion");
  const [major = 0, minor = 0, patch = 0] = output
    .trim()
    .split(".")
    .map((value) => Number.parseInt(value, 10));

  cachedVersion = {
    major,
    minor,
    patch,
  } satisfies Semver;

  return cachedVersion;
}
