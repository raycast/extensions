import { Action, ActionPanel, environment, Icon } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESSES } from "../helpers/constants";
import { calculateAdjustedBrightness, getClosestBrightness } from "../helpers/colors";

// dimming_delta exists, but Increase and Decrease send the new brightness, so the optimistic update can use it.
export default function BrightnessActions(props: { brightness: number; onSet: (brightness: number) => void }) {
  const closestBrightness = getClosestBrightness(props.brightness);
  return (
    <>
      <ActionPanel.Submenu
        title="Set Brightness"
        icon={getProgressIcon(props.brightness / 100, environment.appearance === "light" ? "#000" : "#fff")}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "b" },
          Windows: { modifiers: ["ctrl", "shift"], key: "b" },
        }}
      >
        {BRIGHTNESSES.map((brightness) => (
          <Action key={brightness} title={`${brightness}% Brightness`} onAction={() => props.onSet(brightness)} />
        ))}
      </ActionPanel.Submenu>
      {closestBrightness < BRIGHTNESS_MAX && (
        <Action
          title="Increase Brightness"
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "arrowUp" },
            Windows: { modifiers: ["ctrl", "shift"], key: "arrowUp" },
          }}
          icon={Icon.Plus}
          onAction={() => props.onSet(calculateAdjustedBrightness(props.brightness, "increase"))}
        />
      )}
      {closestBrightness > BRIGHTNESS_MIN && (
        <Action
          title="Decrease Brightness"
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "arrowDown" },
            Windows: { modifiers: ["ctrl", "shift"], key: "arrowDown" },
          }}
          icon={Icon.Minus}
          onAction={() => props.onSet(calculateAdjustedBrightness(props.brightness, "decrease"))}
        />
      )}
    </>
  );
}
