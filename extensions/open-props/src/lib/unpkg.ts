import { ofetch } from "ofetch";
import { SupportedVersion } from "./open-props/types";

export function buildUnpkgUrl(path: string, version: string = "1"): string {
  return `https://unpkg.com/open-props@${version}/${path}`;
}

export async function fetchPackageVersion(majorVersion: SupportedVersion = "1") {
  const result = await ofetch<{ version: string }>(buildUnpkgUrl("?meta", majorVersion));
  return result.version;
}

export async function fetchUnpkgFile(path: string, version: string) {
  return await ofetch<string>(buildUnpkgUrl(path, version));
}
