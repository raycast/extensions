import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import nativeHelpers from "../assets/native-helpers.json";

export { nativeHelpers };
export type NativeHelper = (typeof nativeHelpers.helpers)[number];

export function getNativeHelper(name: string): NativeHelper {
  const helper = nativeHelpers.helpers.find((helper) => helper.name === name);
  if (!helper) throw new Error(`Unknown native helper: ${name}`);
  return helper;
}

export function nativeHelperSources(helper: NativeHelper, assets: string): string[] {
  return [helper.source, ...helper.additionalSources].map((source) => path.join(assets, source));
}

/** Build, runtime and host installation must use the same ordered source identity. */
export function nativeHelperSourceHash(helper: NativeHelper, assets: string): string {
  const source = nativeHelperSources(helper, assets)
    .map((file) => readFileSync(file, "utf8"))
    .join("\0");
  return createHash("sha256").update(source).digest("hex").slice(0, 12);
}
