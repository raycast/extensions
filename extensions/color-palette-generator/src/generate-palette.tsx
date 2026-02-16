import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { useForm } from "@raycast/utils";
import { generatePalette, isValidHex, toCssVariables, toTailwindConfig } from "./utils/colors";
import { savePalette } from "./utils/storage";
import { AlgorithmType, Color, Palette } from "./types";
import { randomUUID } from "node:crypto";

const ALGORITHMS: { id: AlgorithmType; title: string; section: string }[] = [
  { id: "monochromatic", title: "Monochromatic", section: "Harmony Algorithms" },
  { id: "analogous", title: "Analogous", section: "Harmony Algorithms" },
  { id: "complementary", title: "Complementary", section: "Harmony Algorithms" },
  { id: "triadic", title: "Triadic", section: "Harmony Algorithms" },
  { id: "split-complementary", title: "Split-Complementary", section: "Harmony Algorithms" },
  { id: "web", title: "Web Theme", section: "Use Cases" },
  { id: "app", title: "App Theme", section: "Use Cases" },
  { id: "dashboard", title: "Dashboard / Data Viz", section: "Use Cases" },
  { id: "marketing", title: "Marketing / Landing Page", section: "Use Cases" },
];

const COUNTS = [3, 5, 7, 10];

export default function Command() {
  const [baseColor, setBaseColor] = useState<string>("");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>("monochromatic");
  const [count, setCount] = useState<number>(5);
  const [colors, setColors] = useState<Color[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function generate() {
      const cleanHex = baseColor.startsWith("#") ? baseColor : `#${baseColor}`;

      if (isValidHex(cleanHex)) {
        setIsLoading(true);
        try {
          const newColors = generatePalette(cleanHex, selectedAlgorithm, count);
          setColors(newColors);
        } catch {
          showToast({ style: Toast.Style.Failure, title: "Failed to generate palette" });
        } finally {
          setIsLoading(false);
        }
      } else {
        if (!baseColor) setColors([]);
      }
    }

    generate();
  }, [baseColor, selectedAlgorithm, count]);

  const handleRandom = () => {
    const randomColor =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    setBaseColor(randomColor.toUpperCase());
    showToast({ style: Toast.Style.Success, title: "Random color generated" });
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter base color (e.g. #3B82F6)..."
      searchText={baseColor}
      onSearchTextChange={setBaseColor}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Generation Settings"
          onChange={(newValue) => setSelectedAlgorithm(newValue as AlgorithmType)}
        >
          <List.Dropdown.Section title="Harmony Algorithms">
            {ALGORITHMS.filter((a) => a.section === "Harmony Algorithms").map((algo) => (
              <List.Dropdown.Item key={algo.id} value={algo.id} title={algo.title} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Use Cases">
            {ALGORITHMS.filter((a) => a.section === "Use Cases").map((algo) => (
              <List.Dropdown.Item key={algo.id} value={algo.id} title={algo.title} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Generate Random Color"
            icon={Icon.Shuffle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleRandom}
          />
        </ActionPanel>
      }
      isShowingDetail={colors.length > 0}
    >
      {colors.length === 0 ? (
        <List.EmptyView
          icon={Icon.Brush}
          title="Start Designing"
          description="Enter a hex color or press ⌘R to generate a random palette."
          actions={
            <ActionPanel>
              <Action
                title="Generate Random Color"
                icon={Icon.Shuffle}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleRandom}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Generated Palette (${selectedAlgorithm})`}>
          {colors.map((color, index) => (
            <List.Item
              key={color.hex + index}
              title={color.name || color.hex}
              subtitle={color.name ? color.hex : undefined}
              icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
              detail={
                <List.Item.Detail
                  markdown={`![Color](${getSingleColorImage(color.hex)})`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Hex" text={color.hex} />
                      <List.Item.Detail.Metadata.Label
                        title="RGB"
                        text={`${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="HSL"
                        text={`${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}%`}
                      />
                      {/* Detailed formats */}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="OKLCH"
                        text={`${color.oklch.l}, ${color.oklch.c}, ${color.oklch.h}°`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="HSV"
                        text={`${color.hsv.h}°, ${color.hsv.s}%, ${color.hsv.v}%`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="CMYK"
                        text={`${color.cmyk.c}%, ${color.cmyk.m}%, ${color.cmyk.y}%, ${color.cmyk.k}%`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="LAB"
                        text={`${color.lab.l}, ${color.lab.a}, ${color.lab.b}`}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy Color">
                    <Action.CopyToClipboard title="Copy Hex" content={color.hex} />
                    <Action.CopyToClipboard
                      title="Copy RGB"
                      content={`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`}
                    />
                    <Action.CopyToClipboard
                      title="Copy HSL"
                      content={`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`}
                    />
                    <Action.CopyToClipboard
                      title="Copy OKLCH"
                      content={`oklch(${color.oklch.l} ${color.oklch.c} ${color.oklch.h})`}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Palette Actions">
                    <Action.Push
                      title="Save Palette"
                      icon={Icon.SaveDocument}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      target={<SavePaletteForm colors={colors} algorithm={selectedAlgorithm} />}
                    />
                    <Action
                      title="Generate New Random"
                      icon={Icon.Shuffle}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={handleRandom}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Configuration">
                    <ActionPanel.Submenu title="Set Color Count" icon={Icon.List}>
                      {COUNTS.map((c) => (
                        <Action key={c} title={`${c} Colors`} onAction={() => setCount(c)} />
                      ))}
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Export Palette">
                    <Action.CopyToClipboard
                      title="Copy All as CSS Variables"
                      content={toCssVariables({
                        id: "temp",
                        name: "Generated",
                        colors,
                        algorithm: selectedAlgorithm,
                        createdAt: Date.now(),
                      })}
                    />
                    <Action.CopyToClipboard
                      title="Copy All as Tailwind Config"
                      content={toTailwindConfig({
                        id: "temp",
                        name: "Generated",
                        colors,
                        algorithm: selectedAlgorithm,
                        createdAt: Date.now(),
                      })}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SavePaletteForm({ colors, algorithm }: { colors: Color[]; algorithm: AlgorithmType }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: {
      name: `${algorithm.charAt(0).toUpperCase() + algorithm.slice(1)} Palette`,
    },
    onSubmit: async (values) => {
      try {
        const newPalette: Palette = {
          id: randomUUID(),
          name: values.name,
          colors,
          algorithm,
          createdAt: Date.now(),
        };
        await savePalette(newPalette);
        showToast({ style: Toast.Style.Success, title: "Palette saved!" });
        pop();
      } catch {
        showToast({ style: Toast.Style.Failure, title: "Failed to save palette" });
      }
    },
    validation: {
      name: (value) => (!value ? "Name is required" : undefined),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Palette" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Palette Name" placeholder="My Awesome Palette" {...itemProps.name} />
      <Form.Description text={`Saving ${colors.length} colors to your collection.`} />
    </Form>
  );
}

function getSingleColorImage(hex: string): string {
  const width = 300;
  const height = 150;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="${hex}" />
    </svg>
    `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
