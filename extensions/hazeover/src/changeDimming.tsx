import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { runAppleScriptSilentlyView, runAppleScriptSilentlyNoView } from "./utils";

async function incrementIntensity(intensity: number) {
  const script = `
    tell application "HazeOver"
      if intensity + ${intensity} > 100 then
        set intensity to 100
      else
        set intensity to intensity + ${intensity} 
      end if
    end tell
  `;
  await runAppleScriptSilentlyView(script);
}

async function decrementIntensity(intensity: number) {
  const script = `
    tell application "HazeOver"
      if intensity - ${intensity} < 0 then
        set intensity to 0
      else
        set intensity to intensity - ${intensity} 
      end if
    end tell
  `;
  await runAppleScriptSilentlyView(script);
}

// Possible values to set the intensity to.
const intensities: number[] = [0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

export default function Command() {
  return (
    <List navigationTitle="Change Dimming Intensity">
      <List.Item
        title="Set Intensity"
        subtitle="0-100%"
        icon={{ source: Icon.Dot, tintColor: Color.Blue }}
        actions={
          <ActionPanel title="Set Intensity">
            <ActionPanel.Submenu title="Percentage Values" icon={{ source: Icon.Text, tintColor: Color.PrimaryText }}>
              {intensities.map((i) => (
                <ActionPanel.Item
                  key={i.toString()}
                  title={i.toString()}
                  onAction={() => runAppleScriptSilentlyNoView(`tell application "HazeOver" to set intensity to ${i}`)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
      <List.Item
        title="Increment Intensity"
        subtitle="+20%"
        icon={{ source: Icon.ChevronUp, tintColor: Color.Green }}
        keywords={["add", "plus", "higher", "more"]}
        actions={
          <ActionPanel title="Increment Intensity">
            <ActionPanel.Item
              icon={{ source: Icon.ChevronUp, tintColor: Color.Green }}
              title="Increment Intensity"
              onAction={() => incrementIntensity(20)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Decrement Intensity"
        subtitle="-20%"
        icon={{ source: Icon.ChevronDown, tintColor: Color.Red }}
        keywords={["subtract", "minus", "lower", "less"]}
        actions={
          <ActionPanel title="Decrement Intensity">
            <ActionPanel.Item
              icon={{ source: Icon.ChevronDown, tintColor: Color.Red }}
              title="Decrement Intensity"
              onAction={() => decrementIntensity(20)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
