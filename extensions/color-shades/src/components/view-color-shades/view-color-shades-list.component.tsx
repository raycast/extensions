import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { StorageService } from "../../services/storage.service";
import { GenerateColorShadesGrid } from "../generate-color-shades/generate-color-shades-grid.component";

export function ViewColorShadesList(): JSX.Element {
  const { data: palettes, isLoading, revalidate } = useCachedPromise(StorageService.allPalettes);

  return (
    <List isLoading={isLoading}>
      {palettes
        ?.sort((a, b) => (a.creationDate < b.creationDate == true ? 1 : -1))
        .map((palette) => (
          <List.Item
            accessories={[{ date: palette.creationDate, tooltip: "Created at" }]}
            key={palette.name}
            title={palette.name}
            icon={{
              source: Icon.CircleFilled,
              tintColor: palette.colors[500],
              tooltip: palette.colors[500],
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Palette"
                  icon={Icon.Eye}
                  target={<GenerateColorShadesGrid color={palette.colors[500]} />}
                />
                <Action
                  title="Delete Entry"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    await StorageService.removePalette(palette);
                    revalidate();
                  }}
                />
                <Action
                  title="Delete All Entries"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={async () => {
                    await StorageService.clearAllPalettes();
                    revalidate();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
