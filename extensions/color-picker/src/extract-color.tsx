import { Action, ActionPanel, getSelectedFinderItems, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { isMac } from "./lib/utils";
import { fileManagerName } from "./lib/constants";

type FinalColor = {
  hex: string;
  red: number;
  green: number;
  blue: number;
  area: number;
  hue: number;
  saturation: number;
  lightness: number;
  intensity: number;
};

export default function Command() {
  const [columns, setColumns] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [colors, setColors] = useState<FinalColor[]>([]);
  const [info, setInfo] = useState<{
    title: string;
    description: string;
  }>({
    title: "No image found",
    description: `Select an image from ${fileManagerName} to extract colors`,
  });

  async function loadColors() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Extracting colors",
    });
    let path: string | undefined;

    try {
      const items = await getSelectedFinderItems();
      if (items.length === 0) {
        setIsLoading(false);
      }
      path = items[0].path;
    } catch {
      // did not find any selected items
    }

    if (path) {
      let extractColor: (path: string, colorCount: number, dominantOnly: boolean) => Promise<FinalColor[]>;

      if (isMac) {
        const { extractColor: extractColorSwift } = await import("swift:../swift/extract-color");
        extractColor = extractColorSwift;
      } else {
        const { extract_color: extractColorRust } = await import("rust:../rust/extract-color");
        extractColor = extractColorRust;
      }

      try {
        const colors = await extractColor(path, 40, false); // Set dominantOnly to true

        setColors(colors);
        toast.style = Toast.Style.Success;
        toast.title = "Colors extracted";
        toast.message = `${colors.length} colors extracted from the image`;
        setIsLoading(false);
      } catch (error) {
        console.error("Error extracting colors:", error);
        setIsLoading(false);
        toast.style = Toast.Style.Failure;
        toast.title = "Error extracting colors";
        toast.message = "Please select a valid image file";
      }
    } else {
      setIsLoading(false);
      setInfo({
        title: "No image selected",
        description: `Please select an image from ${fileManagerName} to extract colors`,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "No image selected";
      toast.message = `Please select an image from ${fileManagerName} to extract colors`;
    }
  }

  useEffect(() => {
    loadColors();
  }, []);

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
            setIsLoading(false);
          }}
        >
          <Grid.Dropdown.Item title="Large" value="4" />
          <Grid.Dropdown.Item title="Medium" value="6" />
          <Grid.Dropdown.Item title="Small" value="8" />
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView icon={Icon.Eye} title={info.title} description={info.description} />

      {!isLoading &&
        colors.map((color, i) => (
          <Grid.Item
            key={color.hex + i}
            content={{ color: color.hex }}
            title={`${color.hex.toUpperCase()}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={color.hex} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
