import { ActionPanel, Action, Icon, Color, LocalStorage } from "@raycast/api";
import { BasedDimensions, Orientations, RatioType } from ".";
import CreateCustomRatio from "./create-custom-ratio";

export default function ActionOptions(props: {
  id: string | undefined;
  totalCustomRatios: number;
  ratio: RatioType;
  width: number;
  height: number;
  basedDimension: BasedDimensions;
  orientation: Orientations;
  handleOrientationChange: () => void;
  handleNewCustomRatio: (ar: RatioType) => void;
  handleDeleteItem?: (id: string) => void;
  handleDeleteAll?: () => void;
}) {
  const {
    id,
    totalCustomRatios = 0,
    ratio,
    width,
    height,
    basedDimension,
    orientation,
    handleOrientationChange,
    handleNewCustomRatio,
    handleDeleteItem,
    handleDeleteAll,
  } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section title="Copy">
        {basedDimension === BasedDimensions.BASED_HEIGHT && (
          <Action.CopyToClipboard
            icon={{ source: Icon.Ruler }}
            title={`Copy Width: ${width}`}
            content={width}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
          />
        )}
        {basedDimension === BasedDimensions.BASED_WIDTH && (
          <Action.CopyToClipboard
            icon={{ source: Icon.Ruler }}
            title={`Copy Height: ${height}`}
            content={height}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
        )}
        <Action.CopyToClipboard
          icon={{ source: Icon.Maximize }}
          title={`Copy Full: ${width} × ${height}`}
          content={`${width} × ${height}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
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
      <ActionPanel.Section title="Configuration">
        <Action.Push
          icon={{ source: Icon.Plus }}
          title="Create New"
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={
            <CreateCustomRatio
              totalCustomRatios={totalCustomRatios}
              onCreate={(ar: RatioType) => {
                handleNewCustomRatio(ar);
              }}
            />
          }
        />
        {id && (
          <Action
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            title={`Delete ${orientation === Orientations.LANDSCAPE ? `${ratio.width}:${ratio.height}` : `${ratio.height}:${ratio.width}`}`}
            onAction={async () => {
              if (handleDeleteItem) {
                handleDeleteItem(id);
              }
              await LocalStorage.removeItem(id);
            }}
          />
        )}
        {totalCustomRatios > 0 && (
          <Action
            style={Action.Style.Destructive}
            icon={{ source: Icon.Important, tintColor: Color.Red }}
            title="Delete All Custom Raytios"
            onAction={async () => {
              if (handleDeleteAll) {
                handleDeleteAll();
              }
              await LocalStorage.clear();
            }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
