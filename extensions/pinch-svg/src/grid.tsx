import { Grid, Clipboard, showHUD, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePromise } from "@raycast/utils";

const gridScale = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 32, 64];
const colorArray = ["#FF000040", "#00D6FF40", "#FF00D240", "#FFC70040", "#3cff0040"];
const strokeColorArray = ["#FF0000", "#00D6FF", "#FF00D2", "#FFC700", "#3BFF00"];

type BaseSize = 5 | 8;

type SvgProps = {
  x?: number;
  y?: number;
  size: number;
  padding?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

type SvgItem = {
  id: number;
  size?: number;
  rawSvg: string;
  previewSvg: string;
};

const createSvgString = ({
  size,
  strokeWidth = size <= 24 ? 1 : 4,
  x = 0,
  y = 0,
  padding = 0,
  color = "pink",
  strokeColor = "red",
}: SvgProps): string => {
  const paddedSize = size + padding * 2;
  const fontSize = size <= 32 ? size / 2 : Math.max(16, size / 4);
  const textX = paddedSize * 0.5;
  const textY = paddedSize * 0.5 + fontSize * 0.5;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${paddedSize}" height="${paddedSize}">
  <rect id="whiteBg" x="${padding + x}" y="${padding + y}" width="${size - x * 2}" height="${size - y * 2}" fill="white"/>
  <rect x="${padding + x}" y="${padding + y}" width="${size - x * 2}" height="${size - y * 2}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
  <text x="${textX}" y="${textY}" dominant-baseline="center" text-anchor="middle" font-family="arial" font-size="${fontSize}" fill="black">${size}</text>
</svg>`;
};

const generateSvgGrid = (
  baseSize: number,
  scaleArray: number[],
  multicolored: boolean,
): { raw: string[]; padded: string[] } => {
  const setBoxColor = (index: number) => (multicolored ? colorArray[index % colorArray.length] : "#FF000040");
  const setStrokeColor = (index: number) =>
    multicolored ? strokeColorArray[index % strokeColorArray.length] : "#FF0000";

  const rawSvgString = scaleArray.map((scale, index) =>
    createSvgString({
      size: baseSize * scale,
      color: setBoxColor(index),
      strokeColor: setStrokeColor(index),
    }),
  );

  const raycastSvgPreview = scaleArray.map((scale, index) => {
    const size = baseSize * scale;
    return createSvgString({
      size,
      padding: size * 0.3,
      color: setBoxColor(index),
      strokeColor: setStrokeColor(index),
    });
  });

  return { raw: rawSvgString, padded: raycastSvgPreview };
};

const generateCombinedSvgString = (svgItems: SvgItem[], spacing: number): string => {
  let currentX = 0;
  const svgContent = svgItems
    .map((item) => {
      const width = parseInt((item.rawSvg.match(/width="(\d+)"/) || [])[1], 10);
      const result = `<g transform="translate(${currentX}, 0)">${item.rawSvg
        .replace(/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[^>]*>/, "")
        .replace(/<\/svg>/, "")}</g>`;
      currentX += width + spacing;
      return result;
    })
    .join("");

  const totalWidth = currentX;
  const totalHeight = Math.max(
    ...svgItems.map((item) => parseInt((item.rawSvg.match(/height="(\d+)"/) || [])[1] || "0", 10)),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">${svgContent}</svg>`;
};

const createSvgItems = (rawSvgStrings: string[], paddedSvgStrings: string[]): SvgItem[] => {
  const rawItems = rawSvgStrings.map((svg, index) => ({
    id: index,
    rawSvg: svg,
    previewSvg: encodeSvgToBase64(paddedSvgStrings[index]),
  }));
  generateCombinedSvgString(rawItems, 40);
  return rawItems; // Remove the combined SVG item from rendering
};

const encodeSvgToBase64 = (svg: string): string => {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const copySvgToClipboard = async (svg: string): Promise<void> => {
  try {
    await Clipboard.copy(svg);
    showHUD("SVG copied to clipboard!");
  } catch (error) {
    console.error("Failed to copy SVG:", error);
    showHUD("Failed to copy SVG");
  }
};

const copyCombinedSvgToClipboard = async (svgItems: SvgItem[], spacing: number): Promise<void> => {
  try {
    const combinedSvg = generateCombinedSvgString(svgItems, spacing);
    await Clipboard.copy(combinedSvg);
    showHUD("Combined SVG copied to clipboard!");
  } catch (error) {
    console.error("Failed to copy combined SVG:", error);
    showHUD("Failed to copy combined SVG");
  }
};

export default function Command() {
  const [baseSize, setBaseSize] = useState<BaseSize>(8);
  const [isMulticolored, setIsMulticolored] = useState<boolean>(true);

  const fetchSvgItems = async (
    baseSize: BaseSize,
    gridScale: number[],
    isMulticolored: boolean,
  ): Promise<SvgItem[]> => {
    const { raw, padded } = generateSvgGrid(baseSize, gridScale, isMulticolored);
    return Promise.resolve(createSvgItems(raw, padded));
  };

  const { isLoading, data, revalidate } = usePromise(() => fetchSvgItems(baseSize, gridScale, isMulticolored));

  useEffect(() => {
    revalidate();
  }, [baseSize, isMulticolored]);

  return (
    <Grid
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select base grid size"
          storeValue={true}
          defaultValue={String(baseSize)}
          onChange={(newValue) => {
            setBaseSize(Number(newValue) as BaseSize);
          }}
        >
          <Grid.Dropdown.Section title="Grid Sizes">
            <Grid.Dropdown.Item title="8 Point Grid" value="8" key="8" />
            <Grid.Dropdown.Item title="5 Point Grid" value="5" key="5" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {data?.map((item) => (
        <Grid.Item
          key={item.id}
          content={{ value: item.previewSvg, tooltip: `Copy ${gridScale[item.id] * baseSize}px Rectangle` }}
          title={`${gridScale[item.id] * baseSize}px`}
          actions={
            <ActionPanel>
              <Action title="Copy SVG" onAction={() => copySvgToClipboard(item.rawSvg)} />
              <Action
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                title="Copy All SVGs"
                onAction={() => copyCombinedSvgToClipboard(data!, baseSize * gridScale[5])}
              />
              <Action
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                title={`Switch to ${isMulticolored ? "Monocolored" : "Multicolored"}`}
                onAction={() => {
                  setIsMulticolored((prev) => !prev);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
