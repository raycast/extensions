// Keeps every test off the network: mDNS, fetch and the bridge are fakes, and sleeps and timeouts are short.
import { afterEach, beforeEach, inject, vi } from "vitest";
import { environment, resetRaycast } from "./raycast-stub";
import { closeServers } from "./fakeBridge";
import { resetMdns } from "./mocks/bonjour";
import { sleeps } from "./mocks/timersPromises";

vi.mock("bonjour-service", () => import("./mocks/bonjour"));
vi.mock("timers/promises", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...(await import("./mocks/timersPromises")),
}));
vi.mock("../src/helpers/constants", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  CONNECTION_TIMEOUT_MS: 300,
}));

environment.assetsPath = inject("certDir");

beforeEach(() => {
  resetRaycast();
  resetMdns();
  sleeps.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("fetch is stubbed");
    }),
  );
});

afterEach(closeServers);
