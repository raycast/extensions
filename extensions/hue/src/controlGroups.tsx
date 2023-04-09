import { ActionPanel, Color, Grid, Icon, Toast } from "@raycast/api";
import {
  getColorFromLight,
  getIconForColor,
  getLightsFromGroup,
  optimisticUpdate,
  optimisticUpdates,
} from "./lib/utils";
import { CssColor, Group, GroupedLight, Id, Light, Palette, Room, Scene, Zone } from "./lib/types";
import { BRIGHTNESS_MAX, BRIGHTNESSES, COLORS } from "./lib/constants";
import ManageHueBridge from "./components/ManageHueBridge";
import { useHue } from "./hooks/useHue";
import { getProgressIcon } from "@raycast/utils";
import { useMemo, useState } from "react";
import useGradientUris from "./hooks/useGradientUris";
import "./lib/arrayExtensions";
import useInputRateLimiter from "./hooks/useInputRateLimiter";
import UnlinkAction from "./components/UnlinkAction";
import Style = Toast.Style;

// Exact dimensions of a 16:9 Raycast 5 column grid item.
const GRID_ITEM_WIDTH = 271;
const GRID_ITEM_HEIGHT = 153;

export default function ControlGroups() {
  const useHueObject = useHue();
  const { hueBridgeState, sendHueMessage, isLoading, lights, groupedLights, rooms, zones, scenes } = useHueObject;
  const rateLimiter = useInputRateLimiter(10, 1000);
  const [palettes, setPalettes] = useState(new Map<Id, Palette>([]));
  const { gradientUris } = useGradientUris(palettes, GRID_ITEM_WIDTH, GRID_ITEM_HEIGHT);

  useMemo(() => {
    const groups = [...rooms, ...zones];
    const palettes = new Map<Id, Palette>(
      groups.map((group) => [group.id, getLightsFromGroup(lights, group).map((light) => getColorFromLight(light))])
    );

    setPalettes(palettes);
  }, [rooms, zones, lights]);

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  return (
    <Grid isLoading={isLoading} aspectRatio="16/9">
      {rooms.length > 0 && (
        <Grid.Section title="Rooms">
          {rooms.map((room: Room) => {
            const roomScenes = scenes.filter((scene: Scene) => scene.group.rid == room.id);
            const groupLights = getLightsFromGroup(lights, room);
            const groupedLight = groupedLights.find(
              (groupedLight) =>
                groupedLight.id === room.services.find((resource) => resource.rtype === "grouped_light")?.rid
            );

            return (
              <Group
                key={room.id}
                lights={groupLights}
                groupedLight={groupedLight}
                group={room}
                scenes={roomScenes}
                gradientUri={gradientUris.get(room.id)}
                useHue={useHueObject}
                rateLimiter={rateLimiter}
              />
            );
          })}
        </Grid.Section>
      )}
      {zones.length > 0 && (
        <Grid.Section title="Zones">
          {zones.map((zone: Zone) => {
            const groupLights = getLightsFromGroup(lights, zone);
            const zoneScenes = scenes.filter((scene: Scene) => scene.group.rid == zone.id);
            const groupedLight = groupedLights.find(
              (groupedLight) =>
                groupedLight.id === zone.services.find((resource) => resource.rtype === "grouped_light")?.rid
            );

            return (
              <Group
                key={zone.id}
                group={zone}
                lights={groupLights}
                groupedLight={groupedLight}
                scenes={zoneScenes}
                gradientUri={gradientUris.get(zone.id)}
                useHue={useHueObject}
                rateLimiter={rateLimiter}
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}

function Group(props: {
  lights: Light[];
  groupedLight?: GroupedLight;
  group: Group;
  scenes: Scene[];
  gradientUri?: string;
  useHue: ReturnType<typeof useHue>;
  rateLimiter: ReturnType<typeof useInputRateLimiter>;
}) {
  const lightsOnCount = props.lights.filter((light) => light.on.on).length;
  let lightStatusText;
  if (lightsOnCount === 0) {
    lightStatusText = "All lights are off";
  } else if (lightsOnCount === props.lights.length) {
    lightStatusText = "All lights are on";
  } else if (lightsOnCount === 1) {
    lightStatusText = "1 light is on";
  } else {
    lightStatusText = `${lightsOnCount} lights are on`;
  }

  return (
    <Grid.Item
      key={props.group.id}
      title={props.group.metadata.name}
      subtitle={lightStatusText}
      content={props.groupedLight?.on?.on ? props.gradientUri ?? "" : ""}
      actions={
        props.groupedLight && (
          <ActionPanel>
            <ToggleGroupAction
              group={props.group}
              groupedLight={props.groupedLight}
              onToggle={() => handleToggle(props.useHue, props.rateLimiter, props.group, props.groupedLight)}
            />
            {/* TODO: Disable, hide or replace with no-op "There are no scenes for this room/zone" when that's the case */}
            <SetSceneAction
              group={props.group}
              scenes={props.scenes ?? []}
              onSetScene={(scene: Scene) => handleSetScene(props.useHue, props.rateLimiter, props.group, scene)}
            />
            <ActionPanel.Section>
              <SetBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onSet={(brightness: number) =>
                  handleSetBrightness(props.useHue, props.rateLimiter, props.group, props.groupedLight, brightness)
                }
              />
              <IncreaseBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onIncrease={() =>
                  handleBrightnessChange(props.useHue, props.rateLimiter, props.group, props.groupedLight, "increase")
                }
              />
              <DecreaseBrightnessAction
                group={props.group}
                groupedLight={props.groupedLight}
                onDecrease={() =>
                  handleBrightnessChange(props.useHue, props.rateLimiter, props.group, props.groupedLight, "decrease")
                }
              />
            </ActionPanel.Section>
            {/*
            <ActionPanel.Section>
              {props.group.action.colormode == "xy" && (
                <SetColorAction
                  group={props.group}
                  onSet={(color: CssColor) => handleSetColor(props.hueClient, props.group)}
                />
              )}
              {props.group.action.colormode == "ct" && (
                <IncreaseColorTemperatureAction
                  group={props.group}
                  onIncrease={() => handleIncreaseColorTemperature(props.hueClient, props.group)}
                />
              )}
              {props.group.action.colormode == "ct" && (
                <DecreaseColorTemperatureAction
                  group={props.group}
                  onDecrease={() => handleDecreaseColorTemperature(props.hueClient, props.group)}
                />
              )}
            </ActionPanel.Section>
*/}

            <ActionPanel.Section>
              <UnlinkAction sendHueMessage={props.useHue.sendHueMessage} />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}

function ToggleGroupAction(props: { group: Group; groupedLight: GroupedLight; onToggle: () => void }) {
  return (
    <ActionPanel.Item
      title={`Turn ${props.group.metadata.name} ${props.groupedLight.on?.on ? "Off" : "On"}`}
      icon={props.groupedLight.on?.on ? Icon.LightBulbOff : Icon.LightBulb}
      onAction={props.onToggle}
    />
  );
}

// TODO: Navigate to a scene picker
function SetSceneAction(props: { group: Group; scenes: Scene[]; onSetScene: (scene: Scene) => void }) {
  if (props.scenes.length === 0) {
    return null;
  }

  return (
    <ActionPanel.Submenu title="Set Scene" icon={Icon.Image}>
      {props.scenes.map((scene: Scene) => (
        <ActionPanel.Item key={scene.id} title={scene.metadata.name} onAction={() => props.onSetScene(scene)} />
      ))}
    </ActionPanel.Submenu>
  );
}

function SetBrightnessAction(props: { group: Group; groupedLight: GroupedLight; onSet: (brightness: number) => void }) {
  return (
    <ActionPanel.Submenu
      title="Set Brightness"
      // This should be 0-100, but the API returns 0-254
      icon={getProgressIcon((props.groupedLight.dimming?.brightness ?? 0) / 254, Color.PrimaryText)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
    >
      {BRIGHTNESSES.map((brightness) => (
        <ActionPanel.Item
          key={brightness}
          title={`${brightness}% Brightness`}
          onAction={() => props.onSet(brightness)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function IncreaseBrightnessAction(props: { group: Group; groupedLight: GroupedLight; onIncrease: () => void }) {
  if (props.groupedLight.dimming?.brightness ?? 0 >= BRIGHTNESS_MAX) {
    return null;
  }

  return (
    <ActionPanel.Item
      title="Increase Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  );
}

function DecreaseBrightnessAction(props: { group: Group; groupedLight: GroupedLight; onDecrease: () => void }) {
  if (props.groupedLight.dimming?.brightness ?? 0 <= BRIGHTNESS_MAX) {
    return null;
  }

  return (
    <ActionPanel.Item
      title="Decrease Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

function SetColorAction(props: { group: Group; onSet: (color: CssColor) => void }) {
  return (
    <ActionPanel.Submenu title="Set Color" icon={Icon.Swatch} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}>
      {COLORS.map((color) => (
        <ActionPanel.Item
          key={color.name}
          title={color.name}
          icon={getIconForColor(color)}
          onAction={() => props.onSet(color)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function IncreaseColorTemperatureAction(props: { group: Group; onIncrease?: () => void }) {
  // if (props.group.action.ct >= MIRED_MIN) {
  //   return null;
  // }

  return (
    <ActionPanel.Item
      title="Increase Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  );
}

function DecreaseColorTemperatureAction(props: { group: Group; onDecrease?: () => void }) {
  // if (props.group.action.ct <= MIRED_MIN) {
  //   return null;
  // }

  return (
    <ActionPanel.Item
      title="Decrease Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  );
}

async function handleToggle(
  { hueBridgeState, setGroupedLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  group: Group,
  groupedLight: GroupedLight | undefined
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");

    const changes = {
      on: { on: !groupedLight.on?.on },
    };

    const undoOptimisticUpdate = optimisticUpdate(groupedLight, changes, setGroupedLights);
    await hueBridgeState.context.hueClient.updateGroupedLight(groupedLight, changes).catch((e: Error) => {
      undoOptimisticUpdate();
      throw e;
    });

    toast.style = Style.Success;
    toast.title = groupedLight.on?.on ? `Turned ${group.metadata.name} off` : `Turned ${group.metadata.name} on`;
    await toast.show();
  } catch (e) {
    console.error(e);
    toast.style = Style.Failure;
    toast.title = groupedLight?.on?.on
      ? `Failed turning ${group.metadata.name} off`
      : `Failed turning ${group.metadata.name} on`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetScene(
  { hueBridgeState, lights, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  group: Group,
  scene: Scene
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (!rateLimiter.canExecute()) return;

    const changes = new Map<Id, Partial<Light>>(
      lights
        .filter((light) =>
          scene.actions.some((action) => action.target.rid === light.id || action.target.rid === light.owner.rid)
        )
        .map((light): [Id, Partial<Light>] => {
          const action = scene.actions.find((action) => action.target.rid === light.id);
          return [light.id, (action?.action ?? {}) as Partial<Light>];
        })
    );

    const undoOptimisticUpdates = optimisticUpdates(changes, setLights);
    await hueBridgeState.context.hueClient
      .updateScene(scene, {
        recall: { action: "active" },
      })
      .catch((e: Error) => {
        undoOptimisticUpdates();
        throw e;
      });

    toast.style = Style.Success;
    toast.title = `Scene ${scene.metadata.name} set`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed set scene";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(
  { hueBridgeState, lights, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  group: Group,
  groupedLight: GroupedLight | undefined,
  percentage: number
) {
  const toast = new Toast({ title: "" });
  const brightness = (percentage / 100) * 253 + 1;

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");
    if (!rateLimiter.canExecute()) return;

    await hueBridgeState.context.hueClient.updateGroupedLight(groupedLight, {
      ...(groupedLight.on?.on ? {} : { on: { on: true } }),
      dimming: { brightness: brightness },
    });

    toast.style = Style.Success;
    toast.title = `Set brightness of ${group.metadata.name} to ${(percentage / 100).toLocaleString("en", {
      style: "percent",
    })}.`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = `Failed setting brightness of ${group.metadata.name}.`;
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleBrightnessChange(
  { hueBridgeState, setLights }: ReturnType<typeof useHue>,
  rateLimiter: ReturnType<typeof useInputRateLimiter>,
  group: Group,
  groupedLight: GroupedLight | undefined,
  direction: "increase" | "decrease"
) {
  const toast = new Toast({ title: "" });

  try {
    if (hueBridgeState.context.hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (groupedLight === undefined) throw new Error("Light group not found.");
    if (!rateLimiter.canExecute()) return;

    // await mutateGroups(adjustBrightness(apiPromise, group, "increase"), {
    //   optimisticUpdate(rooms) {
    //     return rooms?.map((it) =>
    //       it.id === group.id
    //         ? { ...it, action: { ...it.action, on: true, bri: calculateAdjustedBrightness(group, "increase") } }
    //         : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = "Increased brightness";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed increasing brightness";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

/*
async function handleSetColor(hueClient: HueClient | undefined, group: Group, color: CssColor) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(setGroupColor(apiPromise, group, color.value), {
    //   optimisticUpdate(rooms) {
    //     return rooms.map((it) =>
    //       it.id === group.id ? { ...it, state: { ...it.state, on: true, xy: hexToXy(color.value) } } : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = `Set color to ${color.name}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting color";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleChangeColorTemperature(
  hueClient: HueClient | undefined,
  group: Group,
  groupedLight: GroupedLight,
  direction: "increase" | "decrease"
) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(adjustColorTemperature(apiPromise, group, "increase"), {
    //   optimisticUpdate(rooms) {
    //     return rooms?.map((it) =>
    //       it.id === group.id
    //         ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(group, "increase") } }
    //         : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = "Increased color temperature";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed increasing color temperature";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
*/
