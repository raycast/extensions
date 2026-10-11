import { describe, expect, it } from "vitest";
import { miredToHexString, xyToRgbHexString } from "../src/helpers/colors";
import {
  getBrightnessFromScene,
  getColorFromLight,
  getColorsFromGroup,
  getColorsFromScene,
  getGroupedLightFromGroup,
  getLightsFromGroup,
  getSceneChanges,
  getScenesFromGroup,
  isReachable,
} from "../src/helpers/hueResources";
import type { DeepPartial, Light, Room, Scene, Xy, ZigbeeConnectivity } from "../src/lib/types";
import { lights, rooms, scenes, zigbeeConnectivity, zones } from "./fixtures/resources";

type Action = Scene["actions"][number]["action"];
type Palette = NonNullable<Scene["palette"]>;

const named = <T extends { metadata: { name: string } }>(items: T[], name: string) =>
  items.find((item) => item.metadata.name === name)!;
const names = (items: { metadata: { name: string } }[]) => items.map((item) => item.metadata.name);

const plug = named(lights, "Living room plug");
const spot = named(lights, "Living room spot 1");
const red: Xy = { x: 0.675, y: 0.322 };
const blue: Xy = { x: 0.167, y: 0.04 };

// A plug, owned by a device of its own, with the dimming and colors the state gives it.
function light(id: string, state: { on: boolean; brightness?: number; mirek?: number; xy?: Xy }): Light {
  return {
    ...plug,
    id,
    owner: { rid: `device-${id}`, rtype: "device" },
    on: { on: state.on },
    ...(state.brightness !== undefined && { dimming: { brightness: state.brightness } }),
    ...(state.mirek !== undefined && { color_temperature: { ...spot.color_temperature!, mirek: state.mirek } }),
    ...(state.xy && { color: { ...spot.color!, xy: state.xy } }),
  };
}

const room = (groupLights: Light[]): Room => ({
  ...named(rooms, "Kitchen"),
  children: groupLights.map((groupLight) => groupLight.owner),
  services: [{ rid: "grouped-light", rtype: "grouped_light" }],
});

const scene = (properties: Partial<Scene>, actions: Action[] = []): Scene => ({
  ...scenes[0],
  palette: undefined,
  actions: actions.map((action, i) => ({ target: { rid: `light-${i}`, rtype: "light" }, action })),
  ...properties,
});

describe("getLightsFromGroup", () => {
  it("finds a room's lights by their device", () => {
    expect(names(getLightsFromGroup(lights, named(rooms, "Living room")))).toEqual(
      names(lights).filter((name) => name.startsWith("Living room")),
    );
  });

  it("finds a zone's lights by their ID", () => {
    const upstairs = named(zones, "Upstairs");
    const ids = getLightsFromGroup(lights, upstairs).map(({ id }) => id);
    expect(ids.sort()).toEqual(upstairs.children.map(({ rid }) => rid).sort());
  });

  it("finds none for a room without lights", () => {
    expect(getLightsFromGroup(lights, named(rooms, "Hallway"))).toEqual([]);
  });
});

describe("isReachable", () => {
  const pendant = named(lights, "Kitchen pendant");
  const connectivity = (status: ZigbeeConnectivity["status"], rid = pendant.owner.rid): ZigbeeConnectivity => ({
    id: "connectivity",
    owner: { rid, rtype: "device" },
    status,
    mac_address: "00:17:88:01:00:00:00:99",
    type: "zigbee_connectivity",
  });

  it("finds the lights whose devices have connectivity issues", () => {
    expect(names(lights.filter((light) => !isReachable(light, zigbeeConnectivity)))).toEqual([
      "Living room spot 3",
      "Living room spot 2",
      "Studio ceiling lamp",
      "Living room spot 1",
      "Living room floor lamp 4",
    ]);
  });

  it.each([
    ["connected", true],
    ["disconnected", false],
    ["connectivity_issue", false],
    ["unidirectional_incoming", false],
    ["pending_discovery", false],
  ] as const)("is %s → %s", (status, reachable) => {
    expect(isReachable(pendant, [connectivity(status)])).toBe(reachable);
  });

  it("is reachable without connectivity for its device", () => {
    expect(isReachable(pendant, [])).toBe(true);
    expect(isReachable(pendant, [connectivity("disconnected", "another-device")])).toBe(true);
  });
});

describe("getGroupedLightFromGroup", () => {
  const group = (...groupLights: Light[]) => getGroupedLightFromGroup(groupLights, room(groupLights));

  it("is undefined for a group without a grouped light", () => {
    expect(getGroupedLightFromGroup(lights, named(rooms, "Hallway"))).toBeUndefined();
  });

  it("is on while any light is on, at the average brightness of the dimmable lights that are on", () => {
    expect(
      group(
        light("a", { on: true, brightness: 20 }),
        light("b", { on: true, brightness: 60 }),
        light("c", { on: false, brightness: 100 }),
        light("plug", { on: true }),
      ),
    ).toEqual({ id: "grouped-light", on: { on: true }, dimming: { brightness: 40 } });
  });

  it("is off at brightness 0 when all lights are off", () => {
    expect(group(light("a", { on: false, brightness: 20 }), light("b", { on: false, brightness: 60 }))).toEqual({
      id: "grouped-light",
      on: { on: false },
      dimming: { brightness: 0 },
    });
  });

  it("has no dimming for a group of only plugs", () => {
    expect(group(light("a", { on: true }), light("b", { on: false }))).toEqual({
      id: "grouped-light",
      on: { on: true },
    });
  });
});

describe("getSceneChanges", () => {
  const withLights = (id: string, active: Scene["status"]["active"], ...sceneLights: Light[]) =>
    scene({
      id,
      status: { active },
      actions: sceneLights.map((sceneLight) => ({
        target: { rid: sceneLight.id, rtype: "light" },
        action: { on: { on: true } },
      })),
    });
  const changes = (change: DeepPartial<Light>, ...changed: Light[]) => new Map(changed.map(({ id }) => [id, change]));
  const [a, b, c] = ["a", "b", "c"].map((id) => light(id, { on: true, brightness: 50, mirek: 300 }));

  it("makes a recalled scene static and ends the other active scenes that share a light with it", () => {
    const recalled = withLights("recalled", "inactive", a, b);
    const current = [
      recalled,
      withLights("static", "static", a, c),
      withLights("dynamic", "dynamic_palette", b),
      withLights("unrelated", "static", c),
      withLights("inactive", "inactive", a),
    ];
    expect(getSceneChanges(current, [a, b, c], changes({ on: { on: true } }, a, b), recalled)).toEqual(
      new Map([
        ["recalled", { status: { active: "static" } }],
        ["static", { status: { active: "inactive" } }],
        ["dynamic", { status: { active: "inactive" } }],
      ]),
    );
  });

  it.each<[string, boolean, DeepPartial<Light>, boolean]>([
    ["switching a light off ends", true, { on: { on: false } }, true],
    ["switching a light on ends", false, { on: { on: true } }, true],
    ["changing a light's color ends", true, { color: { xy: red } }, true],
    ["changing a light's color temperature ends", true, { color_temperature: { mirek: 400 } }, true],
    ["dimming a light doesn't end", true, { dimming: { brightness: 10 } }, false],
    ["turning on a light that is on doesn't end", true, { on: { on: true } }, false],
  ])("without a recall, %s the active scenes with it", (_, on, change, ends) => {
    const changed = light("changed", { on, brightness: 50, mirek: 300 });
    const current = [withLights("with", "static", changed), withLights("without", "static", a)];
    expect(getSceneChanges(current, [changed, a], changes(change, changed))).toEqual(
      new Map(ends ? [["with", { status: { active: "inactive" } }]] : []),
    );
  });

  it("changes nothing without changes", () => {
    expect(getSceneChanges(scenes, lights, new Map())).toEqual(new Map());
  });
});

describe("getScenesFromGroup", () => {
  it("gives only the group's scenes, sorted by name", () => {
    expect(names(getScenesFromGroup(scenes, named(rooms, "Living room")))).toEqual([
      "Bright",
      "Dimmed",
      "Gaming",
      "Holiday",
      "Nightlight",
      "Relax",
      "Rest",
    ]);
  });
});

describe("getBrightnessFromScene", () => {
  it("averages the dimming of the actions that turn lights on", () => {
    const actions = [
      { on: { on: true }, dimming: { brightness: 20 } },
      { on: { on: true }, dimming: { brightness: 60 } },
      { on: { on: false }, dimming: { brightness: 100 } },
      { on: { on: true } },
    ];
    expect(getBrightnessFromScene(scene({}, actions))).toBe(40);
  });

  it.each<[string, Action[]]>([
    ["without actions", []],
    ["when no action turns a light on", [{ on: { on: false }, dimming: { brightness: 20 } }]],
  ])("is 100 %s", (_, actions) => {
    expect(getBrightnessFromScene(scene({}, actions))).toBe(100);
  });
});

describe("getColorsFromGroup", () => {
  const colors = (...groupLights: Light[]) => getColorsFromGroup(groupLights, room(groupLights));

  it("uses only the lights that are on", () => {
    const on = light("on", { on: true, mirek: 300 });
    expect(colors(on, light("off", { on: false, xy: red }))).toEqual([getColorFromLight(on)]);
  });

  it("gives lights a few mirek apart one color", () => {
    expect(colors(light("a", { on: true, mirek: 366 }), light("b", { on: true, mirek: 368 }))).toHaveLength(1);
  });

  it("keeps clearly different colors apart", () => {
    // 2200K, 2700K, red and blue
    const groupLights = [
      light("a", { on: true, mirek: 455 }),
      light("b", { on: true, mirek: 370 }),
      light("c", { on: true, xy: red }),
      light("d", { on: true, xy: blue }),
    ];
    expect(colors(...groupLights).sort()).toEqual(groupLights.map(getColorFromLight).sort());
  });
});

describe("getColorsFromScene", () => {
  const palette = (properties: Partial<Palette>): Palette => ({
    color: [],
    dimming: [],
    color_temperature: [],
    effects: [],
    effects_v2: [],
    ...properties,
  });
  const on = { on: true };
  const dimming = { brightness: 50 };
  const dimmingPalette = palette({ dimming: [dimming] });
  const temperaturePalette = palette({
    ...dimmingPalette,
    color_temperature: [{ color_temperature: { mirek: 400 }, dimming }],
  });
  const colorPalette = palette({ ...temperaturePalette, color: [{ color: { xy: blue }, dimming }] });
  const colorAction = { on, dimming, color: { xy: red } };
  const temperatureAction = { on, dimming, color_temperature: { mirek: 200 } };

  it.each<[string, Palette, Action[], string[]]>([
    ["the palette's colors", colorPalette, [colorAction, temperatureAction], [xyToRgbHexString(blue)]],
    ["the actions' colors", temperaturePalette, [colorAction, temperatureAction], [xyToRgbHexString(red)]],
    ["the palette's color temperatures", temperaturePalette, [temperatureAction], [miredToHexString(400)]],
    ["the actions' color temperatures", dimmingPalette, [temperatureAction], [miredToHexString(200)]],
  ])("prefers %s", (_, scenePalette, actions, expected) => {
    expect(getColorsFromScene(scene({ palette: scenePalette }, actions))).toEqual(expected);
  });

  it.each<[string, Palette | undefined, Action[]]>([
    ["the palette", dimmingPalette, [{ on }]],
    ["an action", undefined, [{ on, dimming }]],
  ])("gives one plain color when only %s dims", (_, scenePalette, actions) => {
    expect(getColorsFromScene(scene({ palette: scenePalette }, actions))).toEqual([expect.any(String)]);
  });

  it("gives no colors without colors, color temperatures or dimming", () => {
    expect(getColorsFromScene(scene({ palette: palette({}) }, [{ on }]))).toEqual([]);
  });
});
