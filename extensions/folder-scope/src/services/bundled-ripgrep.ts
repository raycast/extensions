import { environment } from "@raycast/api";
import type { SearchEngine } from "../types/search";
import { installBundledRipgrep } from "../utils/ripgrep-binary";
import { RipgrepEngine } from "./ripgrep-engine";

let installation: Promise<string> | undefined;

/** Downloads once per extension process; failed attempts remain retryable. */
export function ensureBundledRipgrep(): Promise<string> {
  installation ??= installBundledRipgrep(environment.supportPath).catch((error) => {
    installation = undefined;
    throw error;
  });
  return installation;
}

export function createBundledRipgrepEngine(): SearchEngine {
  return new RipgrepEngine("bundled-ripgrep", ensureBundledRipgrep);
}
