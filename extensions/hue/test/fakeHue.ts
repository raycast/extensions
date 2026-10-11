// Stand-ins for what the view commands' handlers take: a HueClient whose changes resolve, and the Hue object useHue
// returns, whose setters apply updaters at once, like useCachedState's.
import { vi } from "vitest";
import type { Hue } from "../src/hooks/useHue";
import type HueClient from "../src/lib/HueClient";
import type { Light, Room, Scene, Zone } from "../src/lib/types";

export function fakeClient() {
  return {
    updateLight: vi.fn<HueClient["updateLight"]>(async () => []),
    updateGroupedLight: vi.fn<HueClient["updateGroupedLight"]>(async () => []),
    updateScene: vi.fn<HueClient["updateScene"]>(async () => []),
  };
}

export type FakeClient = ReturnType<typeof fakeClient>;

type State<T> = T[] | ((items: T[]) => T[]);
const apply = <T>(items: T[], update: State<T>) => (typeof update === "function" ? update(items) : update);

export function fakeHue(
  options: {
    lights?: Light[];
    scenes?: Scene[];
    rooms?: Room[];
    zones?: Zone[];
    // undefined: not connected
    hueClient?: FakeClient | undefined;
  } = {},
) {
  const { lights = [], scenes = [], rooms = [], zones = [] } = options;
  const hueClient = "hueClient" in options ? options.hueClient : fakeClient();
  const hue = {
    lights,
    scenes,
    rooms,
    zones,
    isLoading: false,
    send: vi.fn(),
    hueBridgeActor: { getSnapshot: () => ({ context: { hueClient } }) },
    setLights: vi.fn((update: State<Light>) => void (hue.lights = apply(hue.lights, update))),
    setScenes: vi.fn((update: State<Scene>) => void (hue.scenes = apply(hue.scenes, update))),
    setRooms: vi.fn((update: State<Room>) => void (hue.rooms = apply(hue.rooms, update))),
    setZones: vi.fn((update: State<Zone>) => void (hue.zones = apply(hue.zones, update))),
  };
  return Object.assign(hue as unknown as Hue, { hueClient });
}
