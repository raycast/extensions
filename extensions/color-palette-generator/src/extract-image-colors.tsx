import { Action, ActionPanel, Grid, Icon, showToast, Toast, useNavigation, Form } from "@raycast/api";
import { useState } from "react";
import { Vibrant } from "node-vibrant/node";
import { Color, Palette } from "./types";
import { createColor } from "./utils/colors";
import { savePalette } from "./utils/storage";
import { randomUUID } from "node:crypto";
import fs from "fs";

export default function Command() {
  const [colors, setColors] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imagePath, setImagePath] = useState<string | null>(null);

  const { push } = useNavigation();

  async function handleFile(file: string) {
    if (!fs.existsSync(file)) {
      showToast({ style: Toast.Style.Failure, title: "File not found" });
      return;
    }

    setIsLoading(true);
    setImagePath(file);

    try {
      const palette = await Vibrant.from(file).getPalette();
      const extracted: Color[] = [];

      if (palette.Vibrant) extracted.push(createColor(palette.Vibrant.hex));
      if (palette.LightVibrant) extracted.push(createColor(palette.LightVibrant.hex));
      if (palette.DarkVibrant) extracted.push(createColor(palette.DarkVibrant.hex));
      if (palette.Muted) extracted.push(createColor(palette.Muted.hex));
      if (palette.LightMuted) extracted.push(createColor(palette.LightMuted.hex));
      if (palette.DarkMuted) extracted.push(createColor(palette.DarkMuted.hex));

      if (extracted.length === 0) {
        showToast({ style: Toast.Style.Failure, title: "No colors found" });
      } else {
        setColors(extracted);
        // Instead of separate component, switch view state? No, render conditionally.
        // We should just render the result view IF we have colors.
        // BUT to support "Save with Name", we need a Form or action.
        // Let's render the Result Grid here if we have colors.
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to extract colors", message: String(error) });
      setColors([]);
    } finally {
      setIsLoading(false);
    }
  }

  // If no colors, show initial file picker form directly
  if (colors.length === 0 && !isLoading) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Analyze Image"
              icon={Icon.Eye}
              onSubmit={(values) => {
                if (values.files && values.files.length > 0) {
                  handleFile(values.files[0]);
                } else {
                  showToast({ style: Toast.Style.Failure, title: "No file selected" });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker id="files" title="Select Image" allowMultipleSelection={false} />
        <Form.Description text="Select an image to extract a color palette from it." />
      </Form>
    );
  }

  // Result View
  return (
    <Grid
      isLoading={isLoading}
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Filter extracted colors..."
    >
      {/* Helper to go back */}
      <Grid.Item
        title="Source Image"
        subtitle="Analyze a different image"
        content={imagePath ? { source: { light: imagePath, dark: imagePath } } : Icon.Image}
        actions={
          <ActionPanel>
            <Action
              title="Save All as Palette"
              icon={Icon.SaveDocument}
              onAction={() => push(<SavePaletteForm colors={colors} />)}
            />
            <Action
              title="Reset (Analyze New Image)"
              icon={Icon.RotateAntiClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                setColors([]);
                setImagePath(null);
              }}
            />
          </ActionPanel>
        }
      />

      {colors.map((color, index) => (
        <Grid.Item
          key={index}
          content={{ source: { light: getSwatch(color.hex), dark: getSwatch(color.hex) } }}
          title={color.hex}
          subtitle={color.name}
          actions={
            <ActionPanel>
              <Action
                title="Save All as Palette"
                icon={Icon.SaveDocument}
                onAction={() => push(<SavePaletteForm colors={colors} />)}
              />
              <Action.CopyToClipboard title="Copy Hex" content={color.hex} />
              <Action.CopyToClipboard title="Copy All Hexes" content={colors.map((c) => c.hex).join(", ")} />
              <Action
                title="Reset (Analyze New Image)"
                icon={Icon.RotateAntiClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  setColors([]);
                  setImagePath(null);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function SavePaletteForm({ colors }: { colors: Color[] }) {
  const { pop } = useNavigation();

  // We need to manage navigation back to root if successful, or just pop this form.
  // If we pop, we go back to results. Ideally we want to go back to root or confirm.

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Palette"
            onSubmit={async (values) => {
              const name = values.name || "Extracted Palette";
              const newPalette: Palette = {
                id: randomUUID(),
                name,
                colors,
                algorithm: "monochromatic", // custom
                createdAt: Date.now(),
              };
              await savePalette(newPalette);
              showToast({ style: Toast.Style.Success, title: "Palette saved!" });
              pop(); // Return to results
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Palette Name" defaultValue="Extracted Palette" placeholder="Enter output name" />
      <Form.Description text={`${colors.length} colors will be saved.`} />
    </Form>
  );
}

function getSwatch(hex: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="${hex}" />
    </svg>
    `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
