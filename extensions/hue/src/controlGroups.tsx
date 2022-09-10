import { ActionPanel, Icon, List, Toast } from "@raycast/api";
import {
  adjustBrightness,
  adjustColorTemperature,
  calculateAdjustedBrightness,
  calculateAdjustedColorTemperature,
  SendHueMessage,
  setGroupBrightness,
  setGroupColor,
  setScene,
  turnGroupOff,
  turnGroupOn,
  useHue,
} from "./lib/hue";
import { MutatePromise } from "@raycast/utils";
import { CssColor, Group, Room, Scene } from "./lib/types";
import { getIconForColor, getLightIcon } from "./lib/utils";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES, COLOR_TEMP_MAX, COLOR_TEMP_MIN, COLORS } from "./lib/constants";
import { hexToXy } from "./lib/colors";
import ManageHueBridge from "./components/ManageHueBridge";
import UnlinkAction from "./components/UnlinkAction";
import Style = Toast.Style;

export default function Command() {
  const { hueBridgeState, sendHueMessage, isLoading, groups, mutateGroups, scenes } = useHue();

  const manageHueBridgeElement: JSX.Element | null = ManageHueBridge(hueBridgeState, sendHueMessage);
  if (manageHueBridgeElement !== null) return manageHueBridgeElement;

  const rooms: Room[] = groups.filter((group: Group) => group.type == "Room") as Room[];
  const entertainmentAreas: Group[] = groups.filter((group: Group) => group.type == "Entertainment");
  const zones: Group[] = groups.filter((group: Group) => group.type == "Zone");

  return (
    <List isLoading={isLoading}>
      {rooms.length > 0 && (
        <List.Section title="Rooms">
          {rooms.map((room: Room) => {
            const roomScenes = scenes.filter((scene: Scene) => scene.group == room.id);
            return (
              <Group
                key={room.id}
                group={room}
                mutateGroups={mutateGroups}
                scenes={roomScenes}
                sendHueMessage={sendHueMessage}
              />
            );
          })}
        </List.Section>
      )}
      {entertainmentAreas.length > 0 && (
        <List.Section title="Entertainment Areas">
          {zones.map((entertainmentArea: Group) => {
            const entertainmentAreaScenes = scenes.filter((scene: Scene) => scene.group == entertainmentArea.id);
            return (
              <Group
                key={entertainmentArea.id}
                group={entertainmentArea}
                mutateGroups={mutateGroups}
                scenes={entertainmentAreaScenes}
                sendHueMessage={sendHueMessage}
              />
            );
          })}
        </List.Section>
      )}
      {zones.length > 0 && (
        <List.Section title="Zones">
          {zones.map((zone: Group) => {
            const zoneScenes = scenes.filter((scene: Scene) => scene.group == zone.id);
            return (
              <Group
                key={zone.id}
                group={zone}
                mutateGroups={mutateGroups}
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
  group: Group;
  mutateGroups: MutatePromise<Group[]>;
  scenes?: Scene[];
  sendHueMessage: SendHueMessage;
}) {
  return (
    <List.Item
      key={props.group.id}
      title={props.group.name}
      icon={getLightIcon(props.group.action)}
      actions={
        <ActionPanel>
          {!props.group.state.all_on && (
            <TurnAllOnAction onTurnAllOn={() => handleTurnAllOn(props.group, props.mutateGroups)} />
          )}
          {props.group.state.any_on && (
            <TurnAllOffAction onTurnAllOff={() => handleTurnAllOff(props.group, props.mutateGroups)} />
          )}
          {(props.scenes?.length ?? 0) > 0 && (
            <SetSceneAction
              group={props.group}
              scenes={props.scenes ?? []}
              onSetScene={(scene: Scene) => scene && handleSetScene(props.group, scene, props.mutateGroups)}
            />
          )}

          <ActionPanel.Section>
            <SetBrightnessAction
              group={props.group}
              onSet={(percentage: number) => handleSetBrightness(props.group, props.mutateGroups, percentage)}
            />
            <IncreaseBrightnessAction
              group={props.group}
              onIncrease={() => handleIncreaseBrightness(props.group, props.mutateGroups)}
            />
            <DecreaseBrightnessAction
              group={props.group}
              onDecrease={() => handleDecreaseBrightness(props.group, props.mutateGroups)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {props.group.action.colormode == "xy" && (
              <SetColorAction
                group={props.group}
                onSet={(color: CssColor) => handleSetColor(props.group, props.mutateGroups, color)}
              />
            )}
            {props.group.action.colormode == "ct" && (
              <IncreaseColorTemperatureAction
                group={props.group}
                onIncrease={() => handleIncreaseColorTemperature(props.group, props.mutateGroups)}
              />
            )}
            {props.group.action.colormode == "ct" && (
              <DecreaseColorTemperatureAction
                group={props.group}
                onDecrease={() => handleDecreaseColorTemperature(props.group, props.mutateGroups)}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <RefreshAction onRefresh={() => props.mutateGroups()} />
            <UnlinkAction sendHueMessage={props.sendHueMessage} />
          </ActionPanel.Section>
        </ActionPanel>
      }
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
        <ActionPanel.Item key={scene.id} title={scene.name} onAction={() => props.onSetScene(scene)} />
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
  return props.group.action.bri < BRIGHTNESS_MAX ? (
    <ActionPanel.Item
      title="Increase Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  ) : null;
}

function DecreaseBrightnessAction(props: { group: Group; onDecrease?: () => void }) {
  return props.group.action.bri > BRIGHTNESS_MIN ? (
    <ActionPanel.Item
      title="Decrease Brightness"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  ) : null;
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
  return props.group.action.bri > COLOR_TEMP_MIN ? (
    <ActionPanel.Item
      title="Increase Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
      icon={Icon.Plus}
      onAction={props.onIncrease}
    />
  ) : null;
}

function DecreaseColorTemperatureAction(props: { group: Group; onDecrease?: () => void }) {
  return props.group.action.bri < COLOR_TEMP_MAX ? (
    <ActionPanel.Item
      title="Decrease Color Temperature"
      shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
      icon={Icon.Minus}
      onAction={props.onDecrease}
    />
  ) : null;
}

function RefreshAction(props: { onRefresh: () => void }) {
  return (
    <ActionPanel.Item
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={props.onRefresh}
    />
  );
}

async function handleTurnAllOn(group: Group, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(turnGroupOn(group), {
      optimisticUpdate(groups) {
        return groups.map((it) =>
          it.id === group.id
            ? {
                ...it,
                state: { any_on: true, all_on: true },
                action: { ...it.action, on: true },
              }
            : it
        );
      },
    });

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

async function handleTurnAllOff(group: Group, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(turnGroupOff(group), {
      optimisticUpdate(groups) {
        return groups?.map((it) =>
          it.id === group.id
            ? {
                ...it,
                state: { any_on: false, all_on: false },
                action: { ...it.action, on: false },
              }
            : it
        );
      },
    });

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

async function handleSetScene(group: Group, scene: Scene, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(setScene(scene));

    toast.style = Style.Success;
    toast.title = `Scene ${scene.name} set`;
    await toast.show();
  } catch (e) {
    toast.style = Style.Failure;
    toast.title = "Failed set scene";
    toast.message = e instanceof Error ? e.message : undefined;
    await toast.show();
  }
}

async function handleSetBrightness(group: Group, mutateGroups: MutatePromise<Group[]>, percentage: number) {
  const toast = new Toast({ title: "" });
  const brightness = (percentage / 100) * 253 + 1;

  try {
    await mutateGroups(setGroupBrightness(group, brightness), {
      optimisticUpdate(rooms) {
        return rooms.map((it) =>
          it.id === group.id ? { ...it, state: { ...it.state, on: true, bri: brightness } } : it
        );
      },
    });

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

async function handleIncreaseBrightness(group: Group, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(adjustBrightness(group, "increase"), {
      optimisticUpdate(rooms) {
        return rooms?.map((it) =>
          it.id === group.id
            ? { ...it, action: { ...it.action, on: true, bri: calculateAdjustedBrightness(group, "increase") } }
            : it
        );
      },
    });

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

async function handleDecreaseBrightness(group: Group, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(adjustBrightness(group, "decrease"), {
      optimisticUpdate(rooms) {
        return rooms.map((it) =>
          it.id === group.id
            ? { ...it, action: { ...it.action, on: true, bri: calculateAdjustedBrightness(group, "decrease") } }
            : it
        );
      },
    });

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

async function handleSetColor(group: Group, mutateGroups: MutatePromise<Group[]>, color: CssColor) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(setGroupColor(group, color.value), {
      optimisticUpdate(rooms) {
        return rooms.map((it) =>
          it.id === group.id ? { ...it, state: { ...it.state, on: true, xy: hexToXy(color.value) } } : it
        );
      },
    });

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

async function handleIncreaseColorTemperature(group: Group, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(adjustColorTemperature(group, "increase"), {
      optimisticUpdate(rooms) {
        return rooms?.map((it) =>
          it.id === group.id
            ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(group, "increase") } }
            : it
        );
      },
    });

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

async function handleDecreaseColorTemperature(group: Group, mutateGroups: MutatePromise<Group[]>) {
  const toast = new Toast({ title: "" });

  try {
    await mutateGroups(adjustColorTemperature(group, "decrease"), {
      optimisticUpdate(rooms) {
        return rooms.map((it) =>
          it.id === group.id
            ? { ...it, state: { ...it.state, ct: calculateAdjustedColorTemperature(group, "decrease") } }
            : it
        );
      },
    });

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
