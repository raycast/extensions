import { beforeEach, vi } from "vitest";
import * as version from "../src/mise/version";
import { useCachedPromiseFixtures } from "./raycast-utils";

vi.mock("@raycast/api", () => import("./raycast-api"));
// useForm is plain React state over the Form props, so the real one runs as is.
vi.mock("@raycast/utils", async (importOriginal) => {
  const { useForm, FormValidation } = await importOriginal<typeof import("@raycast/utils")>();
  return { ...(await import("./raycast-utils")), useForm, FormValidation };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  useCachedPromiseFixtures.clear();
  // Every command reads the mise version on launch; against the /bin/sh stand-in that would spawn a
  // shell per render. Unknown keeps the flags every release accepts; a test can override it.
  vi.spyOn(version, "readVersion").mockResolvedValue(undefined);
});
