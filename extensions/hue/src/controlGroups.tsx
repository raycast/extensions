import { ActionPanel, Icon, List, Toast } from "@raycast/api";
import { getGroupIcon, getIconForColor, } from "./lib/utils";
import { CssColor, Group, Room, Scene } from "./lib/types";
import { BRIGHTNESSES } from "./lib/constants";
import { COLORS } from "./lib/colors";
import ManageHueBridge from "./components/ManageHueBridge";
import { SendHueMessage, useHue } from "./lib/useHue";
import HueClient from "./lib/HueClient";
import Style = Toast.Style;

export default function ControlGroups() {
  const { hueBridgeState, sendHueMessage, isLoading, rooms, zones, scenes } = useHue();

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const groups = ([] as Group[]).concat(rooms, zones);

  // TODO: Add preference for room/zone grouping
  //  - Rooms first
  //  - Zones first
  //  - Mixed

  return (
    <List isLoading={isLoading}>
      {rooms.length > 0 && (
        <List.Section title="Rooms">
          {rooms.map((room: Room) => {
            const roomScenes = scenes.filter((scene: Scene) => scene.group.rid == room.id);
            return (
              <Group
                hueClient={hueBridgeState.context.hueClient}
                key={room.id}
                group={room}
                scenes={roomScenes}
                sendHueMessage={sendHueMessage}
              />
            );
          })}
        </List.Section>
      )}
      {zones.length > 0 && (
        <List.Section title="Zones">
          {zones.map((zone: Group) => {
            const zoneScenes = scenes.filter((scene: Scene) => scene.group.rid == zone.id);
            return (
              <Group
                hueClient={hueBridgeState.context.hueClient}
                key={zone.id}
                group={zone}
                scenes={zoneScenes}
                sendHueMessage={sendHueMessage}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function Group(props: {
  hueClient?: HueClient;
  group: Group;
  scenes?: Scene[];
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Item
      key={props.group.id}
      title={props.group.metadata.name}
      icon={getGroupIcon(props.group)}
      /*
      actions={
        <ActionPanel>
          {!props.group.state.all_on && (
            <TurnAllOnAction onTurnAllOn={() => handleTurnAllOn(props.hueClient, props.group)} />
          )}
          {props.group.state.any_on && (
            <TurnAllOffAction
              onTurnAllOff={() => handleTurnAllOff(props.hueClient, props.group)}
            />
          )}
          {(props.scenes?.length ?? 0) > 0 && (
            <SetSceneAction
              group={props.group}
              scenes={props.scenes ?? []}
              onSetScene={(scene: Scene) =>
                scene && handleSetScene(props.hueClient, props.group, scene)
              }
            />
          )}

          <ActionPanel.Section>
            <SetBrightnessAction
              group={props.group}
              onSet={(percentage: number) => handleSetBrightness(props.hueClient, props.group, percentage)
              }
            />
            <IncreaseBrightnessAction
              group={props.group}
              onIncrease={() => handleIncreaseBrightness(props.hueClient, props.group)}
            />
            <DecreaseBrightnessAction
              group={props.group}
              onDecrease={() => handleDecreaseBrightness(props.hueClient, props.group)}
            />
          </ActionPanel.Section>
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

          <ActionPanel.Section>
            <UnlinkAction sendHueMessage={props.sendHueMessage} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      */
    />
  );
}

function TurnAllOnAction({ onTurnAllOn }: { onTurnAllOn?: () => void }) {
  return <ActionPanel.Item title="Turn All On" icon={Icon.LightBulb} onAction={onTurnAllOn} />;
}

function TurnAllOffAction({ onTurnAllOff }: { onTurnAllOff?: () => void }) {
  return <ActionPanel.Item title="Turn All Off" icon={Icon.LightBulbOff} onAction={onTurnAllOff} />;
}

function SetSceneAction(props: { group: Group; scenes: Scene[]; onSetScene: (scene: Scene) => void }) {
  return (
    <ActionPanel.Submenu title="Set Scene" icon={Icon.Image}>
      {props.scenes.map((scene: Scene) => (
        <ActionPanel.Item
          key={scene.id}
          title={scene.metadata.name}
          // icon={scene.metadata.image}
          onAction={() => props.onSetScene(scene)} />
      ))}
    </ActionPanel.Submenu>
  );
}

function SetBrightnessAction(props: { group: Group; onSet: (percentage: number) => void }) {
  return (
    <ActionPanel.Submenu
      title="Set Brightness"
      icon={Icon.CircleProgress}
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

function IncreaseBrightnessAction(props: { group: Group; onIncrease?: () => void }) {
  // if (props.group.action.bri >= BRIGHTNESS_MAX) {
  //   return null;
  // }

  return (
    <ActionPanel.Item
      title="Increase Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  );
}

function DecreaseBrightnessAction(props: { group: Group; onDecrease?: () => void }) {
  // if (props.group.action.bri <= BRIGHTNESS_MIN) {
  //   return null;
  // }

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
  // if (props.group.action.ct >= MIREK_MIN) {
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
  // if (props.group.action.ct <= MIREK_MIN) {
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

async function handleTurnAllOn(hueClient: HueClient | undefined, group: Group) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(turnGroupOn(apiPromise, group), {
    //   optimisticUpdate(groups) {
    //     return groups.map((it) =>
    //       it.id === group.id
    //         ? {
    //           ...it,
    //           state: { any_on: true, all_on: true },
    //           action: { ...it.action, on: true },
    //         }
    //         : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = "Turned group on";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed turning group on";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleTurnAllOff(hueClient: HueClient | undefined, group: Group) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(turnGroupOff(apiPromise, group), {
    //   optimisticUpdate(groups) {
    //     return groups?.map((it) =>
    //       it.id === group.id
    //         ? {
    //           ...it,
    //           state: { any_on: false, all_on: false },
    //           action: { ...it.action, on: false },
    //         }
    //         : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = "Turned group off";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed turning group off";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetScene(
  hueClient: HueClient | undefined,
  group: Group,
  scene: Scene,
) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(setScene(apiPromise, scene));

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
  hueClient: HueClient | undefined,
  group: Group,
  percentage: number
) {
  const toast = new Toast({ title: "" });
  const brightness = (percentage / 100) * 253 + 1;

  try {
    // await mutateGroups(setGroupBrightness(apiPromise, group, brightness), {
    //   optimisticUpdate(rooms) {
    //     return rooms.map((it) =>
    //       it.id === group.id ? { ...it, state: { ...it.state, on: true, bri: brightness } } : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = `Set brightness to ${(percentage / 100).toLocaleString("en", { style: "percent" })}`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed setting brightness";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleIncreaseBrightness(hueClient: HueClient | undefined, group: Group) {
  const toast = new Toast({ title: "" });

  try {
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

async function handleDecreaseBrightness(hueClient: HueClient | undefined, group: Group) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(adjustBrightness(apiPromise, group, "decrease"), {
    //   optimisticUpdate(rooms) {
    //     return rooms.map((it) =>
    //       it.id === group.id
    //         ? { ...it, action: { ...it.action, on: true, bri: calculateAdjustedBrightness(group, "decrease") } }
    //         : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = "Decreased brightness";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed decreasing brightness";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetColor(
  hueClient: HueClient | undefined,
  group: Group,
  color: CssColor
) {
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

async function handleIncreaseColorTemperature(
  hueClient: HueClient | undefined,
  group: Group,
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

async function handleDecreaseColorTemperature(
  hueClient: HueClient | undefined,
  group: Group,
) {
  const toast = new Toast({ title: "" });

  try {
    // await mutateGroups(adjustColorTemperature(apiPromise, group, "decrease"), {
    //   optimisticUpdate(rooms) {
    //     return rooms.map((it) =>
    //       it.id === group.id
    //         ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(group, "decrease") } }
    //         : it
    //     );
    //   },
    // });

    toast.style = Style.Success;
    toast.title = "Decreased color temperature";
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed decreasing color temperature";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}
