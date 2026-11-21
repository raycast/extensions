import { describe, expect, it, vi } from "vitest";
import ToggleAllLights from "../src/toggleAllLights";
import { useHueResources } from "../src/hooks/useHue";
import { BRIDGE_CONFIG_KEY, RESOURCES_CACHE_NAMESPACE } from "../src/helpers/constants";
import { caches, environment, LaunchType, preferences, showHUD, storage, updateCommandMetadata } from "./raycast-stub";
import { BRIDGE_ID, closedAddress, html, json, puts, resources, startBridge, USERNAME } from "./fakeBridge";
import { mdns } from "./mocks/bonjour";
import * as fixtures from "./fixtures/resources";

// Records the keys useHueResources reads, and lets it run outside React.
const useCachedState = vi.hoisted(() =>
  vi.fn<(key: string, initial: unknown, options?: { cacheNamespace?: string }) => unknown>((_key, initial) => [
    initial,
    () => {},
  ]),
);
vi.mock("@raycast/utils", async (importOriginal) => ({ ...(await importOriginal<object>()), useCachedState }));

const LIT = { none: [false, false, false], all: [true, true, true], some: [true, false, false] };

// Saves the fake bridge as linked. It serves three lights, on as given, and applies the PUTs to them. Only three, as the
// lights queue sends one PUT every 100 ms.
async function linkedBridge(lit = LIT.all) {
  const bridge = await startBridge();
  const served = lit.map((on, index) => ({ ...fixtures.lights[index], on: { on } }));
  bridge.routes["GET /clip/v2/resource/light"] = (stream) => json(stream, 200, resources(served));
  bridge.routes["PUT /clip/v2/resource/light/"] = (stream, body, headers) => {
    const light = served.find(({ id }) => headers[":path"]!.endsWith(id))!;
    light.on = JSON.parse(body).on;
    json(stream, 200, resources([{ rid: light.id, rtype: "light" }]));
  };
  storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(bridge.config));
  return { bridge, served };
}

const saveDeadBridge = async () =>
  storage.set(
    BRIDGE_CONFIG_KEY,
    JSON.stringify({ ipAddress: await closedAddress(), id: BRIDGE_ID, username: USERNAME }),
  );

describe("without a saved bridge", () => {
  it("shows a HUD on a user launch", async () => {
    await ToggleAllLights();
    expect(showHUD).toHaveBeenCalledWith("No Hue Bridge configured");
  });

  it("rethrows in a background run", async () => {
    environment.launchType = LaunchType.Background;
    await expect(ToggleAllLights()).rejects.toThrow("No Hue Bridge configured");
  });
});

it("on a user launch, finds a bridge whose saved address is dead through MeetHue", async () => {
  const { bridge } = await linkedBridge(LIT.some);
  await saveDeadBridge();
  vi.mocked(fetch).mockResolvedValue(Response.json([{ id: BRIDGE_ID, internalipaddress: bridge.address, port: 443 }]));
  await ToggleAllLights();
  expect(fetch).toHaveBeenCalled();
  expect(puts(bridge)).toHaveLength(1);
});

it("in a background run, rejects without looking for a bridge whose saved address is dead", async () => {
  environment.launchType = LaunchType.Background;
  await saveDeadBridge();
  await expect(ToggleAllLights()).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
  expect(mdns.queries).toBe(0);
});

it("in a background run, toggles nothing and only refreshes the subtitle", async () => {
  const { bridge } = await linkedBridge(LIT.some);
  environment.launchType = LaunchType.Background;
  await ToggleAllLights();
  expect(puts(bridge)).toEqual([]);
  expect(showHUD).not.toHaveBeenCalled();
  expect(updateCommandMetadata.mock.calls).toEqual([[{ subtitle: "1 of 3 lights are on" }]]);
});

it.each([
  { lit: "none", preference: "off", direction: "on" },
  { lit: "all", preference: "on", direction: "off" },
  { lit: "some", preference: "off", direction: "off" },
  { lit: "some", preference: "on", direction: "on" },
] as const)(
  "with $lit on and the preference $preference, turns $direction only the lights that aren't",
  async ({ lit, preference, direction }) => {
    const { bridge, served } = await linkedBridge(LIT[lit]);
    preferences.toggleAllLights = preference;
    const on = direction === "on";
    const expected = served
      .filter((light) => light.on.on !== on)
      .map(({ id }) => ({ path: `/clip/v2/resource/light/${id}`, body: { on: { on } } }));
    await ToggleAllLights();
    expect(puts(bridge)).toEqual(expected);
  },
);

it("reports how many lights it turned and how many failed", async () => {
  const { bridge, served } = await linkedBridge();
  bridge.routes[`PUT /clip/v2/resource/light/${served[1].id}`] = (stream) => html(stream, 500);
  await ToggleAllLights();
  // Turned off 2, failed 1
  expect(showHUD).toHaveBeenCalledWith(expect.stringMatching(/\b2\b.*\b1\b/));
});

it("sets the subtitle to the lights that are on after toggling", async () => {
  await linkedBridge(LIT.some);
  await ToggleAllLights();
  expect(updateCommandMetadata).toHaveBeenCalledWith({ subtitle: "All lights are off" });
});

it("caches the resources where useHueResources reads them, and only those", async () => {
  const bridge = await startBridge();
  storage.set(BRIDGE_CONFIG_KEY, JSON.stringify(bridge.config));
  environment.launchType = LaunchType.Background;
  await ToggleAllLights();
  useHueResources();
  const reads = useCachedState.mock.calls;
  expect(reads).not.toHaveLength(0);
  for (const [key, , options] of reads) {
    const cached = caches.get(options?.cacheNamespace ?? "")?.get(key);
    expect(JSON.parse(cached ?? "null"), key).toEqual(fixtures[key as keyof typeof fixtures]);
  }
  expect([...caches.get(RESOURCES_CACHE_NAMESPACE)!.keys()].sort()).toEqual(reads.map(([key]) => key).sort());
});
