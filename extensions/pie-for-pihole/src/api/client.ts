import { getPreferenceValues } from "@raycast/api";
import type { PiholeAPI } from "./types";
import { PiholeV5 } from "./v5";

let instance: PiholeAPI | null = null;

export function getPiholeAPI(): PiholeAPI {
  if (instance) return instance;

  const { PIHOLE_VERSION } = getPreferenceValues<{ PIHOLE_VERSION?: string }>();

  if (PIHOLE_VERSION === "v6") {
    // Lazy import to avoid loading v6 code when using v5
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PiholeV6 } = require("./v6") as typeof import("./v6");
    instance = new PiholeV6();
  } else {
    instance = new PiholeV5();
  }

  return instance;
}
