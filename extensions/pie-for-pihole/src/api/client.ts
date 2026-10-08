import { getPreferenceValues } from "@raycast/api";
import type { PiholeAPI } from "./types";
import { PiholeV5 } from "./v5";

let instance: PiholeAPI | null = null;
let cachedVersion: string | undefined;

export function getPiholeAPI(): PiholeAPI {
  const { PIHOLE_VERSION } = getPreferenceValues<Preferences>();

  if (instance && cachedVersion === PIHOLE_VERSION) return instance;

  if (PIHOLE_VERSION === "v6") {
    // Lazy import to avoid loading v6 code when using v5
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PiholeV6 } = require("./v6") as typeof import("./v6");
    instance = new PiholeV6();
  } else {
    instance = new PiholeV5();
  }

  cachedVersion = PIHOLE_VERSION;
  return instance;
}
