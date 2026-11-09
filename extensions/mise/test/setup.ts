import { beforeEach, vi } from "vitest";
import * as version from "../src/mise/version";
import { useCachedPromiseFixtures } from "./raycast-utils";

vi.mock("@raycast/api", () => import("./raycast-api"));
vi.mock("@raycast/utils", () => import("./raycast-utils"));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  useCachedPromiseFixtures.clear();
  // Every command reads the mise version on launch; against the /bin/sh stand-in that would spawn a
  // shell per render. Unknown keeps the flags every release accepts; a test can override it.
  vi.spyOn(version, "readVersion").mockResolvedValue(undefined);
});
