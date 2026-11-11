import { Grid, Icon } from "@raycast/api";
import { isValidHexColor } from "../utils/isValidHexColor";

interface FormPalettePreviewProps {
  colors: string[];
}

// this is only a preview "read-only" component to show the colors in a grid
export function FormPalettePreview({ colors }: FormPalettePreviewProps) {
  const validColors = colors.filter((color) => color && isValidHexColor(color));

  return (
    <Grid navigationTitle="Color Palette Preview">
      {validColors.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.EyeDisabled}
          title="No Colors to Preview"
          description="Please add at least one valid HEX color to preview the palette"
        />
      ) : (
        validColors.map((color, index) => (
          <Grid.Item key={`${color}-${index}`} content={{ color }} title={`Color ${index + 1}`} subtitle={color} />
        ))
      )}
    </Grid>
  );
}
