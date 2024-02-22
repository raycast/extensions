import { ActionPanel, Action, Icon, Grid } from "@raycast/api";
import { GeneratorService } from "../../services/generator.service";
import { PaletteService } from "../../services/palette.service";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Palette } from "../../models/palette.model";

export function GenerateColorShadesGrid(props: { color: string }): JSX.Element {
  const [baseColor, setBaseColor] = useState<string>(props.color);
  const { data: palette, isLoading, revalidate } = usePromise(GeneratorService.generatePalette, [baseColor]);
  return (
    <Grid isLoading={isLoading} columns={11} navigationTitle={palette?.name}>
      {Object.entries(palette?.colors ?? []).map(([name, color]) => (
        <Grid.Item
          key={name}
          content={{
            color: {
              light: color,
              dark: color,
              adjustContrast: false,
            },
          }}
          title={name}
          subtitle={color}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={color} />
              <Action
                title="Use as Base Color"
                icon={{ source: Icon.RotateClockwise }}
                onAction={() => {
                  setBaseColor(color);
                  revalidate();
                }}
              />
              <Action.CopyToClipboard
                title="Copy All Colors as Variables"
                content={PaletteService.variableDeclarationReadyPalette(palette as Palette)}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Colors as JSON"
                content={PaletteService.jsonStringPalette(palette as Palette)}
                shortcut={{ modifiers: ["ctrl", "opt"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      )
    </Grid>
  );
}
