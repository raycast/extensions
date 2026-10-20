import { beforeEach, vi } from "vitest";
import { useCachedPromiseFixtures } from "./raycast-utils";

vi.mock("@raycast/api", () => import("./raycast-api"));
vi.mock("@raycast/utils", () => import("./raycast-utils"));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  useCachedPromiseFixtures.clear();
});
