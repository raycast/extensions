import { describe, expect, it } from "vitest";
import { handleSetBrightness, handleToggle } from "../src/controlGroups";
import { handleSetColor } from "../src/controlLights";
import { handleSetScene } from "../src/setScene";
import { getGroupedLightFromGroup, getLightsFromGroup } from "../src/helpers/hueResources";
import { hexToXy } from "../src/helpers/colors";
import type { Hue } from "../src/hooks/useHue";
import type { Scene } from "../src/lib/types";
import { toasts } from "./raycast-stub";
import { fakeHue } from "./fakeHue";
import { lights, rooms, scenes, zones } from "./fixtures/resources";

const canExecute = () => true;
const find = <T extends { id: string }>(items: T[], id: string) => items.find((item) => item.id === id)!;
const offIds = (hue: Hue) => hue.lights.filter((light) => !light.on.on).map((light) => light.id);

// Every light is on in the fixtures, so the Office is too.
const office = rooms.find((room) => room.metadata.name === "Office")!;
const officeLights = getLightsFromGroup(lights, office);
const groupedLight = getGroupedLightFromGroup(lights, office)!;
const toggle = (hue: Hue) => handleToggle(hue, canExecute, officeLights, groupedLight, office);

describe("group toggle", () => {
  it("sends only on to the grouped light, without dynamics, and switches every light of the group", async () => {
    const hue = fakeHue({ lights, scenes });
    await toggle(hue);
    expect(hue.hueClient!.updateGroupedLight.mock.calls).toStrictEqual([[groupedLight, { on: { on: false } }]]);
    expect(offIds(hue)).toEqual(officeLights.map((light) => light.id));
  });

  it("keeps a zone on while another of its rooms is on", async () => {
    const bedroom = rooms.find((room) => room.metadata.name === "Bedroom")!;
    const upstairs = zones.find((zone) => zone.metadata.name === "Upstairs")!;
    const hue = fakeHue({ lights, scenes });
    const bedroomLights = getLightsFromGroup(lights, bedroom);
    await handleToggle(hue, canExecute, bedroomLights, getGroupedLightFromGroup(lights, bedroom)!, bedroom);
    expect(getGroupedLightFromGroup(hue.lights, bedroom)?.on).toEqual({ on: false });
    expect(getGroupedLightFromGroup(hue.lights, upstairs)?.on).toEqual({ on: true });
  });

  it("reports the bridge's error and undoes the change", async () => {
    const hue = fakeHue({ lights, scenes });
    hue.hueClient!.updateGroupedLight.mockRejectedValue(new Error("Status 500 from Hue Bridge"));
    await toggle(hue);
    expect(toasts).toEqual([expect.objectContaining({ event: "show", style: "FAILURE" })]);
    expect(offIds(hue)).toEqual([]);
  });
});

it("group brightness sends only on and the brightness", async () => {
  const hue = fakeHue({ lights, scenes });
  await handleSetBrightness(hue, canExecute, officeLights, groupedLight, office, 40);
  expect(hue.hueClient!.updateGroupedLight.mock.calls).toStrictEqual([
    [groupedLight, { on: { on: true }, dimming: { brightness: 40 } }],
  ]);
});

it("Set Color sends the color's xy and brightness, and clears the light's color temperature", async () => {
  const spot = lights.find((light) => light.metadata.name === "Living room spot 1")!;
  const hue = fakeHue({ lights, scenes });
  const { xy, brightness } = hexToXy("#ff0000");
  await handleSetColor(hue, canExecute, spot, { name: "Red", value: "#ff0000" });
  expect(hue.hueClient!.updateLight.mock.calls).toStrictEqual([
    [spot, { on: { on: true }, color: { xy }, dimming: { brightness } }],
  ]);
  expect(find(hue.lights, spot.id)).toMatchObject({
    color: { xy },
    color_temperature: { mirek: null, mirek_valid: false },
  });
});

describe("scene recall", () => {
  const groups = [...rooms, ...zones];
  const downstairs = groups.find((group) => group.metadata.name === "Downstairs")!;
  // With color and color temperature actions, and lights in the Office's and the Living room's active Relax scenes.
  const nightlight = scenes.find((scene) => scene.metadata.name === "Nightlight" && scene.group.rid === downstairs.id)!;
  const recall = () => {
    const hue = fakeHue({ lights, scenes });
    return handleSetScene(hue, downstairs, nightlight).then(() => hue);
  };

  it("recalls the scene on the bridge", async () => {
    const hue = await recall();
    expect(hue.hueClient!.updateScene.mock.calls).toStrictEqual([[nightlight, { recall: { action: "active" } }]]);
  });

  it("applies each action to its light, clearing the color temperature of lights given a color", async () => {
    const hue = await recall();
    for (const { target, action } of nightlight.actions) {
      const { color, color_temperature, ...rest } = action;
      expect(find(hue.lights, target.rid)).toMatchObject({
        ...rest,
        ...(color
          ? { color, color_temperature: { mirek: null, mirek_valid: false } }
          : color_temperature && { color_temperature }),
      });
    }
  });

  it("turns the scene static and the other active scenes with one of its lights inactive", async () => {
    const hue = await recall();
    const summary = (scene: Scene) =>
      `${scene.metadata.name} in ${find(groups, scene.group.rid).metadata.name}: ${scene.status.active}`;
    expect(hue.scenes.filter((scene, index) => scene !== scenes[index]).map(summary)).toEqual([
      "Nightlight in Downstairs: static",
      "Relax in Office: inactive",
      "Relax in Living room: inactive",
    ]);
  });
});
