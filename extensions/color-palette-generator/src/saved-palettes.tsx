import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  Grid,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useForm } from "@raycast/utils";
import {
  getPalettes,
  deletePalette,
  duplicatePalette,
  renamePalette,
  savePalette,
  getCollections,
  saveCollection,
  deleteCollection,
  renameCollection,
  movePaletteToCollection,
} from "./utils/storage";
import { Palette, Color, ColorBlindnessType, AlgorithmType, Collection } from "./types";
import {
  toCssVariables,
  toTailwindConfig,
  toJSON,
  simulateColorBlindness,
  getHarmonies,
  getShadesAndTints,
  splitCamelCase,
  getColorMeaning,
} from "./utils/colors";
import { getNearestPhysicalColor } from "./utils/physical-colors";
import { getContrastRatio, getWCAGScore } from "./utils/contrast";
import GeneratePaletteCommand from "./generate-palette";
import { randomUUID } from "crypto";

export default function Command() {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { push } = useNavigation();

  async function loadData() {
    setIsLoading(true);
    try {
      const [pStats, cStats] = await Promise.all([getPalettes(), getCollections()]);
      setPalettes(pStats);
      setCollections(cStats);
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to load data" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (await confirmAlert({ title: "Are you sure you want to delete this palette?" })) {
      await deletePalette(id);
      await loadData();
      showToast({ style: Toast.Style.Success, title: "Palette deleted" });
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicatePalette(id);
    await loadData();
    showToast({ style: Toast.Style.Success, title: "Palette duplicated" });
  };

  const filteredPalettes =
    selectedCollectionId === "all" ? palettes : palettes.filter((p) => p.collectionId === selectedCollectionId);

  return (
    <Grid
      isLoading={isLoading}
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Large}
      searchBarPlaceholder="Search saved palettes..."
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Collection" storeValue onChange={setSelectedCollectionId}>
          <Grid.Dropdown.Item title="All Collections" value="all" icon={Icon.AppWindow} />
          <Grid.Dropdown.Section title="Collections">
            {collections.map((c) => (
              <Grid.Dropdown.Item key={c.id} title={c.name} value={c.id} icon={Icon.Folder} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={Icon.Document}
        title="No Saved Palettes"
        description="Generate a new palette to get started."
        actions={
          <ActionPanel>
            <Action title="Generate New Palette" icon={Icon.Plus} onAction={() => push(<GeneratePaletteCommand />)} />
            <Action.Push
              title="Create Collection"
              icon={Icon.Plus}
              target={<CreateCollectionForm onUpdate={loadData} />}
            />
          </ActionPanel>
        }
      />

      {filteredPalettes.map((palette) => (
        <Grid.Item
          key={palette.id}
          title={palette.name}
          subtitle={`${palette.colors.length} colors • ${new Date(palette.createdAt).toLocaleDateString()}`}
          content={{
            source: {
              light: getPaletteImage(palette.colors),
              dark: getPaletteImage(palette.colors),
            },
          }}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={<PaletteDetail palette={palette} collections={collections} onUpdate={loadData} />}
              />
              <ActionPanel.Section title="Management">
                <Action
                  title="Duplicate"
                  icon={Icon.Duplicate}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => handleDuplicate(palette.id)}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(palette.id)}
                />
                <Action.Push
                  title="Move to Collection"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  target={<MoveToCollectionForm palette={palette} collections={collections} onUpdate={loadData} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Collections">
                <Action.Push
                  title="Create New Collection"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  target={<CreateCollectionForm onUpdate={loadData} />}
                />
                <Action.Push
                  title="Manage Collections"
                  icon={Icon.List}
                  target={<ManageCollectionsView collections={collections} onUpdate={loadData} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Export">
                <Action.CopyToClipboard title="Copy CSS Variables" content={toCssVariables(palette)} />
                <Action.CopyToClipboard title="Copy Tailwind Config" content={toTailwindConfig(palette)} />
                <Action.CopyToClipboard title="Copy JSON" content={toJSON(palette)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function CreateCollectionForm({ onUpdate }: { onUpdate: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    onSubmit: async (values) => {
      await saveCollection({
        id: randomUUID(),
        name: values.name,
        createdAt: Date.now(),
      });
      await onUpdate();
      showToast({ style: Toast.Style.Success, title: "Collection created" });
      pop();
    },
    validation: {
      name: (value) => (!value ? "Name is required" : undefined),
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Collection" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Collection Name" placeholder="Client Work, Website V2..." {...itemProps.name} />
    </Form>
  );
}

function MoveToCollectionForm({
  palette,
  collections,
  onUpdate,
}: {
  palette: Palette;
  collections: Collection[];
  onUpdate: () => void;
}) {
  const { pop } = useNavigation();

  // Initial value is explicitly string (collection ID) or empty string for "None"
  const initialCollectionId = palette.collectionId || "";

  const { handleSubmit, itemProps } = useForm<{ collectionId: string }>({
    initialValues: {
      collectionId: initialCollectionId,
    },
    onSubmit: async (values) => {
      const newCollectionId = values.collectionId === "" ? undefined : values.collectionId;
      await movePaletteToCollection(palette.id, newCollectionId);
      await onUpdate();
      showToast({ style: Toast.Style.Success, title: "Moved to collection" });
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move Palette" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Select Collection" {...itemProps.collectionId}>
        <Form.Dropdown.Item value="" title="None (Uncategorized)" icon={Icon.Circle} />
        {collections.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function ManageCollectionsView({ collections, onUpdate }: { collections: Collection[]; onUpdate: () => void }) {
  return (
    <List navigationTitle="Manage Collections">
      <List.EmptyView icon={Icon.Folder} title="No Collections" />
      {collections.map((c) => (
        <List.Item
          key={c.id}
          title={c.name}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Rename Collection"
                icon={Icon.Pencil}
                target={<RenameCollectionForm collection={c} onUpdate={onUpdate} />}
              />
              <Action
                title="Delete Collection"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({ title: "Delete this collection?", message: "Palettes will be uncategorized." })
                  ) {
                    await deleteCollection(c.id);
                    await onUpdate();
                    showToast({ style: Toast.Style.Success, title: "Collection deleted" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RenameCollectionForm({ collection, onUpdate }: { collection: Collection; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: collection.name },
    onSubmit: async (values) => {
      await renameCollection(collection.id, values.name);
      await onUpdate();
      showToast({ style: Toast.Style.Success, title: "Collection renamed" });
      pop();
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
    </Form>
  );
}

function getPaletteImage(colors: Color[]): string {
  const width = 500;
  const height = 300;
  const itemWidth = width / colors.length;

  // Generate SVG string
  const rects = colors
    .map((c, i) => `<rect x="${i * itemWidth}" y="0" width="${itemWidth}" height="${height}" fill="${c.hex}" />`)
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        ${rects}
    </svg>
    `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function PaletteDetail({
  palette,
  collections,
  onUpdate,
}: {
  palette: Palette;
  collections: Collection[];
  onUpdate: () => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: palette.name },
    onSubmit: async (values) => {
      await renamePalette(palette.id, values.name);
      await onUpdate();
      showToast({ style: Toast.Style.Success, title: "Palette renamed" });
      pop();
    },
  });

  return (
    <List navigationTitle={palette.name} isShowingDetail>
      <List.Item
        title="Configuration"
        icon={Icon.Gear}
        actions={
          <ActionPanel>
            <Action.Push
              title="Rename Palette"
              icon={Icon.Pencil}
              target={
                <Form
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm title="Save Name" onSubmit={handleSubmit} />
                    </ActionPanel>
                  }
                >
                  <Form.TextField title="Name" {...itemProps.name} />
                </Form>
              }
            />
            <Action.Push
              title="Move to Collection"
              icon={Icon.Folder}
              target={<MoveToCollectionForm palette={palette} collections={collections} onUpdate={onUpdate} />}
            />
            <Action.Push
              title="Simulate Color Blindness"
              icon={Icon.Eye}
              target={<ColorBlindnessView palette={palette} />}
            />
            <Action.Push
              title="View Contrast Matrix"
              icon={Icon.AppWindow}
              target={<ContrastMatrixView palette={palette} />}
            />
          </ActionPanel>
        }
      />

      <List.Section title="Colors">
        {palette.colors.map((color, index) => (
          <List.Item
            key={color.hex + index}
            title={splitCamelCase(color.name || "") || color.hex}
            subtitle={color.name ? color.hex : undefined}
            icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
            accessories={[{ icon: Icon.ChevronRight }]}
            detail={<List.Item.Detail markdown={`![Color](${getPaletteImage([color])})`} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Color Analysis"
                  icon={Icon.Eye}
                  target={<ColorKnowledgeView color={color} />}
                />
                <Action.Push
                  title="Check Contrast"
                  icon={Icon.Circle}
                  target={<ContrastCheckerView color={color} palette={palette} />}
                />
                <Action.CopyToClipboard title="Copy Hex" content={color.hex} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ColorKnowledgeView({ color }: { color: Color }) {
  const harmonies = getHarmonies(color);
  const { shades, tints, tones } = getShadesAndTints(color);

  const onWhite = getContrastRatio(color.hex, "#FFFFFF");
  const onBlack = getContrastRatio(color.hex, "#000000");

  const getScoreLabel = (ratio: number) => {
    if (ratio >= 21) return "Super";
    if (ratio >= 7) return "Very Good (AAA)";
    if (ratio >= 4.5) return "Good (AA)";
    if (ratio >= 3) return "Poor";
    return "Very Poor";
  };

  const ral = getNearestPhysicalColor(color.hex, "RAL");
  const copic = getNearestPhysicalColor(color.hex, "COPIC");
  const prisma = getNearestPhysicalColor(color.hex, "PRISMACOLOR");

  return (
    <List isShowingDetail navigationTitle={splitCamelCase(color.name || "") || color.hex}>
      <List.Item
        title="Analysis"
        icon={Icon.Info}
        detail={
          <List.Item.Detail
            markdown={`
# ${splitCamelCase(color.name || "Unknown")} (${color.hex})
## Psychology
${color.meaning || getColorMeaning(color.hex)}

![Swatch](${getPaletteImage([color])})

## Physical Matches
| System | Code | Name | Approx. |
| --- | --- | --- | --- |
| **RAL** | ${ral.code} | ${ral.name} | ${ral.hex} |
| **COPIC** | ${copic.code} | ${copic.name} | ${copic.hex} |
| **Prismacolor** | ${prisma.code} | ${prisma.name} | ${prisma.hex} |

## Accessibility
| Background | Ratio | Score |
| --- | --- | --- |
| **White** | ${onWhite.toFixed(2)}:1 | ${getScoreLabel(onWhite)} |
| **Black** | ${onBlack.toFixed(2)}:1 | ${getScoreLabel(onBlack)} |

## Formats
| Format | Value |
| --- | --- |
| **RGB** | ${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b} |
| **HSL** | ${color.hsl.h}°, ${color.hsl.s}%, ${color.hsl.l}% |
| **HSB(V)** | ${color.hsv.h}°, ${color.hsv.s}%, ${color.hsv.v}% |
| **CMYK** | ${color.cmyk.c}%, ${color.cmyk.m}%, ${color.cmyk.y}%, ${color.cmyk.k}% |
| **LAB** | ${color.lab.l}, ${color.lab.a}, ${color.lab.b} |
| **OKLCH** | ${color.oklch.l}, ${color.oklch.c}, ${color.oklch.h}° |
| **XYZ** | ${color.xyz.x}, ${color.xyz.y}, ${color.xyz.z} |
| **HWB** | ${color.hwb.h}°, ${color.hwb.w}%, ${color.hwb.b}% |
| **LCH** | ${color.lch.l}, ${color.lch.c}, ${color.lch.h}° |
| **LUV** | ${color.luv.l}, ${color.luv.u}, ${color.luv.v} |
                        `}
          />
        }
      />

      <List.Section title="Shades & Tints">
        <List.Item
          title="Shades (Darker)"
          detail={<List.Item.Detail markdown={`![Shades](${getPaletteImage(shades)})`} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Palette from Shades"
                target={
                  <SavePaletteForm
                    colors={shades}
                    algorithm="monochromatic"
                    baseName={`${splitCamelCase(color.name || "")} Shades`}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Tints (Lighter)"
          detail={<List.Item.Detail markdown={`![Tints](${getPaletteImage(tints)})`} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Palette from Tints"
                target={
                  <SavePaletteForm
                    colors={tints}
                    algorithm="monochromatic"
                    baseName={`${splitCamelCase(color.name || "")} Tints`}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Tones (Desaturated)"
          detail={<List.Item.Detail markdown={`![Tones](${getPaletteImage(tones)})`} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Palette from Tones"
                target={
                  <SavePaletteForm
                    colors={tones}
                    algorithm="monochromatic"
                    baseName={`${splitCamelCase(color.name || "")} Tones`}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Harmonies">
        {Object.entries(harmonies).map(([name, colors]) => (
          <List.Item
            key={name}
            title={name}
            detail={<List.Item.Detail markdown={`![${name}](${getPaletteImage(colors)})`} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Create ${name} Palette`}
                  target={
                    <SavePaletteForm
                      colors={colors}
                      algorithm="monochromatic"
                      baseName={`${splitCamelCase(color.name || "")} ${name}`}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function SavePaletteForm({
  colors,
  algorithm,
  baseName,
}: {
  colors: Color[];
  algorithm: AlgorithmType;
  baseName: string;
}) {
  const { pop } = useNavigation();

  // We can allow saving to a collection directly too, but for simplicity let's stick to name first.
  // Or we could add a dropdown here. Let's start simple.

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: {
      name: baseName,
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
      <Form.Description text={`Saving ${colors.length} colors.`} />
    </Form>
  );
}

function ContrastCheckerView({ color, palette }: { color: Color; palette: Palette }) {
  const candidates = [
    { name: "White", hex: "#FFFFFF" },
    { name: "Black", hex: "#000000" },
    ...palette.colors
      .filter((c) => c.hex !== color.hex)
      .map((c) => ({ name: splitCamelCase(c.name || "") || c.hex, hex: c.hex })),
  ];

  return (
    <List isShowingDetail navigationTitle={`Contrast vs ${splitCamelCase(color.name || "") || color.hex}`}>
      {candidates.map((candidate, index) => {
        const ratio = getContrastRatio(color.hex, candidate.hex);
        const score = getWCAGScore(ratio);
        const isPass = score !== "Fail";

        return (
          <List.Item
            key={index}
            title={candidate.name}
            subtitle={candidate.hex}
            icon={{ source: Icon.CircleFilled, tintColor: candidate.hex }}
            accessories={[
              { text: `${ratio.toFixed(2)}:1` },
              {
                icon: isPass
                  ? { source: Icon.CheckCircle, tintColor: "green" }
                  : { source: Icon.XMarkCircle, tintColor: "red" },
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={`
# Contrast Result
## ${ratio.toFixed(2)}:1 (${score})

**Foreground**: ${color.hex} (${splitCamelCase(color.name || "") || "Base"})
**Background**: ${candidate.hex} (${candidate.name})

---

### Preview (Fg on Bg)
<div style="background-color: ${candidate.hex}; padding: 20px; border-radius: 8px;">
<p style="color: ${color.hex}; font-size: 24px; font-weight: bold;">Large Text (18pt+)</p>
<p style="color: ${color.hex}; font-size: 16px;">Normal body text. The quick brown fox jumps over the lazy dog.</p>
</div>

### Preview (Bg on Fg)
<div style="background-color: ${color.hex}; padding: 20px; border-radius: 8px;">
<p style="color: ${candidate.hex}; font-size: 24px; font-weight: bold;">Large Text (18pt+)</p>
<p style="color: ${candidate.hex}; font-size: 16px;">Normal body text. The quick brown fox jumps over the lazy dog.</p>
</div>
                                `}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="WCAG Level"
                      text={score}
                      icon={isPass ? Icon.CheckCircle : Icon.XMarkCircle}
                    />
                    <List.Item.Detail.Metadata.Label title="Large Text" text={ratio >= 3 ? "Pass" : "Fail"} />
                    <List.Item.Detail.Metadata.Label title="Normal Text" text={ratio >= 4.5 ? "Pass" : "Fail"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}

function ColorBlindnessView({ palette }: { palette: Palette }) {
  const types: { id: ColorBlindnessType; title: string }[] = [
    { id: "protanopia", title: "Protanopia (Red-Blind)" },
    { id: "deuteranopia", title: "Deuteranopia (Green-Blind)" },
    { id: "tritanopia", title: "Tritanopia (Blue-Blind)" },
    { id: "achromatopsia", title: "Achromatopsia (Total Color Blindness)" },
  ];

  return (
    <List isShowingDetail navigationTitle="Color Blindness Simulation">
      <List.Item
        title="Normal Vision"
        icon={Icon.Eye}
        detail={<List.Item.Detail markdown={`### Normal Vision\n\n![Img](${getPaletteImage(palette.colors)})`} />}
      />
      {types.map((type) => {
        const simColors = palette.colors.map((c) => ({
          ...c,
          hex: simulateColorBlindness(c.hex, type.id),
        }));
        return (
          <List.Item
            key={type.id}
            title={type.title}
            icon={Icon.EyeSlash}
            detail={
              <List.Item.Detail
                markdown={`### ${type.title}\n\n![Img](${getPaletteImage(simColors)})`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Simulated Palette" />
                    {simColors.map((c) => (
                      <List.Item.Detail.Metadata.Label
                        key={c.hex}
                        title={c.hex}
                        icon={{ source: Icon.CircleFilled, tintColor: c.hex }}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}

function ContrastMatrixView({ palette }: { palette: Palette }) {
  // Generate all passing pairs
  const pairs = [];
  for (let i = 0; i < palette.colors.length; i++) {
    for (let j = i + 1; j < palette.colors.length; j++) {
      const c1 = palette.colors[i];
      const c2 = palette.colors[j];
      const ratio = getContrastRatio(c1.hex, c2.hex);
      if (ratio >= 4.5) {
        // AA Normal
        pairs.push({ c1, c2, ratio, score: getWCAGScore(ratio) });
      }
    }
  }

  // Also check against Black/White
  const commonPairs = [];
  for (const c of palette.colors) {
    const wRatio = getContrastRatio(c.hex, "#FFFFFF");
    if (wRatio >= 4.5)
      commonPairs.push({
        c1: c,
        c2: { hex: "#FFFFFF", name: "White" } as Color,
        ratio: wRatio,
        score: getWCAGScore(wRatio),
      });

    const bRatio = getContrastRatio(c.hex, "#000000");
    if (bRatio >= 4.5)
      commonPairs.push({
        c1: c,
        c2: { hex: "#000000", name: "Black" } as Color,
        ratio: bRatio,
        score: getWCAGScore(bRatio),
      });
  }

  const allPairs = [...pairs, ...commonPairs].sort((a, b) => b.ratio - a.ratio);

  return (
    <List navigationTitle="Accessible Pairs (AA+)">
      {allPairs.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No accessible pairs found"
          description="Try adjusting your palette brightness."
        />
      ) : (
        allPairs.map((pair, idx) => (
          <List.Item
            key={idx}
            title={`${splitCamelCase(pair.c1.name || "") || pair.c1.hex} + ${splitCamelCase(pair.c2.name || "") || pair.c2.hex}`}
            subtitle={pair.score}
            icon={{ source: Icon.CircleFilled, tintColor: pair.c1.hex }}
            accessories={[
              { icon: { source: Icon.CircleFilled, tintColor: pair.c2.hex } },
              { text: `${pair.ratio.toFixed(2)}:1` },
              { icon: Icon.CheckCircle },
            ]}
          />
        ))
      )}
    </List>
  );
}
