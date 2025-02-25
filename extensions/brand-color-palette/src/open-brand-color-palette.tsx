import { Grid } from "@raycast/api";
import { useState, useEffect } from "react";
import { TokenMode, ColorPaletteItem } from "./types";
import { groupColorsByCategory } from "./utils/colors";
import { getColors, getPrimitives, getTokens } from "./utils/storage";
import { ViewSelector } from "./components/ViewSelector";
import { ColorSection } from "./components/ColorSection";

export default function Command() {
  const [selectedView, setSelectedView] = useState<"primitives" | "tokens">("tokens");
  const [tokenMode, setTokenMode] = useState<TokenMode>("light");
  const [colors, setColors] = useState<ColorPaletteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadColors() {
    try {
      const stored = await getColors();
      setColors(stored);
    } catch (error) {
      console.error("Failed to load colors:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadColors();
  }, []);

  const filteredColors = selectedView === "primitives" ? getPrimitives(colors) : getTokens(colors);
  const groupedColors: Map<string, ColorPaletteItem[]> = groupColorsByCategory(filteredColors);

  return (
    <Grid
      navigationTitle="Brand Kit"
      searchBarAccessory={
        selectedView === "tokens" ? (
          <Grid.Dropdown
            tooltip="Select Color Mode"
            value={tokenMode}
            onChange={(newValue) => setTokenMode(newValue as TokenMode)}
          >
            <Grid.Dropdown.Item title="Light Mode" value="light" />
            <Grid.Dropdown.Item title="Dark Mode" value="dark" />
          </Grid.Dropdown>
        ) : null
      }
      isLoading={isLoading}
    >
      <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} onSave={loadColors} />

      {Array.from(groupedColors.entries()).map(([category, colors]) => (
        <ColorSection key={category} title={category} colors={colors} tokenMode={tokenMode} onUpdate={loadColors} />
      ))}
    </Grid>
  );
}
