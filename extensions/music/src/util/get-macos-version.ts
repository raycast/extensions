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

export async function getMacosVersion() {
  const output = await execute("sw_vers", "-productVersion");

  const [major = 0, minor = 0, patch = 0] = output.split(".").map(parseInt);

  return {
    major,
    minor,
    patch,
  } satisfies Semver;
}
