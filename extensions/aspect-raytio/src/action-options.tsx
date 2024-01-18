import { ActionPanel, Action, Icon, Color, LocalStorage } from "@raycast/api";
import { BasedDimensions, Orientations, RatioType } from ".";

export default function ActionOptions(props: {
  id: string | undefined;
  ratio: RatioType;
  width: number;
  height: number;
  basedDimension: BasedDimensions;
  orientation: Orientations;
  handleOrientationChange: () => void;
}) {
  const {
    id,
    ratio,
    width,
    height,
    basedDimension,
    orientation,
    handleOrientationChange,
  } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Copy">
        {basedDimension === BasedDimensions.BASED_HEIGHT && (
          <Action.CopyToClipboard
            icon={{ source: Icon.Ruler }}
            title={`Copy Width: ${width}`}
            content={width}
            shortcut={{ modifiers: [], key: "w" }}
          />
        )}
        {basedDimension === BasedDimensions.BASED_WIDTH && (
          <Action.CopyToClipboard
            icon={{ source: Icon.Ruler }}
            title={`Copy Height: ${height}`}
            content={height}
            shortcut={{ modifiers: [], key: "h" }}
          />
        )}
        <Action.CopyToClipboard
          icon={{ source: Icon.Maximize }}
          title={`Copy Full: ${width} × ${height}`}
          content={`${width} × ${height}`}
          shortcut={{ modifiers: [], key: "f" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Orientation">
        <Action
          icon={{ source: Icon.Switch }}
          title={`Switch to ${orientation === Orientations.LANDSCAPE ? Orientations.PORTRAIT : Orientations.LANDSCAPE}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={() => handleOrientationChange()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
