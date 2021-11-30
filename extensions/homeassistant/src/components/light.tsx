import { ActionPanel, Color } from "@raycast/api";
import { ha } from "../common";
import { State } from "../haapi";

function getBrightnessValues(): number[] {
  const result: number[] = [];
  for (let i = 100; i >= 0; i = i - 10) {
    result.push(i);
  }
  return result;
}

export function BrightnessControlAction(props: { state: State }): JSX.Element | null {
  const state = props.state;
  const modes = state.attributes.supported_color_modes;

  const handle = async (bvalue: number) => {
    await ha.callService("light", "turn_on", { entity_id: state.entity_id, brightness_pct: `${bvalue}` });
  };

  if (modes && Array.isArray(modes) && modes.includes("brightness")) {
    const brightnessValues = getBrightnessValues();
    return (
      <ActionPanel.Submenu
        title="Brightness"
        icon={{ source: "lightbulb.png", tintColor: Color.PrimaryText }}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
      >
        {brightnessValues.map((value) => (
          <ActionPanel.Item key={`${value}`} title={`${value} %`} onAction={() => handle(value)} />
        ))}
      </ActionPanel.Submenu>
    );
  }
  return null;
}
