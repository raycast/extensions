import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DelphitoolsInstallStatusView,
  getDelphitoolsInstallStatus,
} from "./delphitools-install";

type PaperSeries = "all" | "a" | "b" | "c" | "us";
type PaperUnit = "mm" | "in" | "pt";

type PaperSize = {
  height: number;
  name: string;
  series: Exclude<PaperSeries, "all">;
  unit: PaperUnit | "px";
  width: number;
};

const DEFAULT_UNIT: PaperUnit = "mm";
const DEFAULT_DPI = "72";
const SERIES_OPTIONS: Array<{ title: string; value: PaperSeries }> = [
  { title: "All Series", value: "all" },
  { title: "A Series", value: "a" },
  { title: "B Series", value: "b" },
  { title: "C Series", value: "c" },
  { title: "US Sizes", value: "us" },
];
const UNIT_OPTIONS: Array<{ title: string; value: PaperUnit }> = [
  { title: "Millimeters", value: "mm" },
  { title: "Inches", value: "in" },
  { title: "Points", value: "pt" },
];
const DPI_OPTIONS = ["72", "96", "150", "300", "600"];

export default function Command(
  props: LaunchProps<{ arguments: Arguments.Paper }>,
) {
  return <PaperCommand initialName={props.arguments.name ?? ""} />;
}

function PaperCommand({ initialName }: { initialName: string }) {
  const [isDelphitoolsInstalled, setIsDelphitoolsInstalled] =
    useState<boolean>();

  useEffect(() => {
    async function checkInstallStatus() {
      const status = await getDelphitoolsInstallStatus();
      setIsDelphitoolsInstalled(status.installed);
    }

    checkInstallStatus();
  }, []);

  if (isDelphitoolsInstalled === false) {
    return <DelphitoolsInstallStatusView status={{ installed: false }} />;
  }

  return <PaperList initialName={initialName} />;
}

function PaperList({ initialName }: { initialName: string }) {
  const [searchText, setSearchText] = useState(initialName);
  const [series, setSeries] = useState<PaperSeries>("all");
  const [unit, setUnit] = useState<PaperUnit>(DEFAULT_UNIT);
  const [showPixels, setShowPixels] = useState(false);
  const [dpi, setDpi] = useState(DEFAULT_DPI);
  const [sizes, setSizes] = useState<PaperSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastToastErrorRef = useRef("");

  useEffect(() => {
    async function loadSizes() {
      setIsLoading(true);

      try {
        const nextSizes = await loadPaperSizes(series, unit);
        setSizes(nextSizes);
        lastToastErrorRef.current = "";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const toastErrorKey = `${series}:${unit}:${message}`;

        if (lastToastErrorRef.current !== toastErrorKey) {
          lastToastErrorRef.current = toastErrorKey;
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not load paper sizes",
            message,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSizes();
  }, [series, unit]);

  const visibleSizes = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return sizes;
    }

    return sizes.filter((size) =>
      `${size.name} ${size.series}`.toLowerCase().includes(normalizedSearch),
    );
  }, [searchText, sizes]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search paper sizes"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Series"
          value={series}
          onChange={(value) => setSeries(value as PaperSeries)}
        >
          {SERIES_OPTIONS.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              title={option.title}
              value={option.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {visibleSizes.map((size) => (
        <PaperListItem
          key={`${size.series}-${size.name}-${unit}-${dpi}-${showPixels}`}
          dpi={dpi}
          series={series}
          setDpi={setDpi}
          setSeries={setSeries}
          setShowPixels={setShowPixels}
          setUnit={setUnit}
          showPixels={showPixels}
          size={size}
          sizes={sizes}
          unit={unit}
        />
      ))}
    </List>
  );
}

function PaperListItem({
  dpi,
  series,
  setDpi,
  setSeries,
  setShowPixels,
  setUnit,
  showPixels,
  size,
  sizes,
  unit,
}: {
  dpi: string;
  series: PaperSeries;
  setDpi: (dpi: string) => void;
  setSeries: (series: PaperSeries) => void;
  setShowPixels: (showPixels: boolean) => void;
  setUnit: (unit: PaperUnit) => void;
  showPixels: boolean;
  size: PaperSize;
  sizes: PaperSize[];
  unit: PaperUnit;
}) {
  const pixels = getPixelSize(size, dpi);
  const dimensions = formatDimensions(size);
  const pixelDimensions = formatDimensions(pixels);

  return (
    <List.Item
      icon={{ source: "paper-icon.png" }}
      title={size.name}
      subtitle={`${dimensions}${showPixels ? ` - ${pixelDimensions}` : ""}`}
      accessories={[
        { text: size.series.toUpperCase() },
        { text: unit },
        ...(showPixels ? [{ text: `${dpi} DPI` }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Dimensions"
            content={dimensions}
          />
          <Action.CopyToClipboard
            icon={Icon.Desktop}
            title="Copy Pixels"
            content={pixelDimensions}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Push
            icon={Icon.Sidebar}
            title="Compare Paper Sizes"
            target={
              <ComparePicker
                dpi={dpi}
                left={size}
                setDpi={setDpi}
                sizes={sizes}
                unit={unit}
              />
            }
          />
          <ActionPanel.Section title="Display">
            <Action
              icon={showPixels ? Icon.EyeDisabled : Icon.Eye}
              title={showPixels ? "Hide Pixels" : "Show Pixels"}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={() => setShowPixels(!showPixels)}
            />
            {UNIT_OPTIONS.map((option) => (
              <Action
                key={option.value}
                title={`Use ${option.title}`}
                icon={unit === option.value ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setUnit(option.value)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Series">
            {SERIES_OPTIONS.map((option) => (
              <Action
                key={option.value}
                title={`Show ${option.title}`}
                icon={series === option.value ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setSeries(option.value)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="DPI">
            <Action.Push
              icon={Icon.Gear}
              title="Set Custom DPI…"
              target={<DpiForm currentDpi={dpi} setDpi={setDpi} />}
            />
            {DPI_OPTIONS.map((option) => (
              <Action
                key={option}
                title={`Set DPI to ${option}`}
                icon={dpi === option ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setDpi(option)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ComparePicker({
  dpi,
  left,
  setDpi,
  sizes,
  unit,
}: {
  dpi: string;
  left: PaperSize;
  setDpi: (dpi: string) => void;
  sizes: PaperSize[];
  unit: PaperUnit;
}) {
  return (
    <List searchBarPlaceholder={`Compare ${left.name} with…`}>
      {sizes
        .filter((size) => size.name !== left.name)
        .map((size) => (
          <List.Item
            key={`${size.series}-${size.name}`}
            icon={{ source: "paper-icon.png" }}
            title={size.name}
            subtitle={formatDimensions(size)}
            accessories={[{ text: size.series.toUpperCase() }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Sidebar}
                  title="Show Comparison"
                  target={
                    <CompareDetail
                      dpi={dpi}
                      left={left}
                      right={size}
                      setDpi={setDpi}
                      sizes={sizes}
                      unit={unit}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function CompareDetail({
  dpi,
  left,
  right,
  setDpi,
  sizes,
  unit,
}: {
  dpi: string;
  left: PaperSize;
  right: PaperSize;
  setDpi: (dpi: string) => void;
  sizes: PaperSize[];
  unit: PaperUnit;
}) {
  const [previewPath, setPreviewPath] = useState("");
  const markdown = getCompareMarkdown(left, right, dpi, previewPath);
  const summary = getCompareSummary(left, right, dpi);

  useEffect(() => {
    async function createPreview() {
      setPreviewPath(await writeComparisonSvg(left, right));
    }

    createPreview();
  }, [left, right]);

  async function copySummary() {
    await Clipboard.copy(summary);
    await showToast({ style: Toast.Style.Success, title: "Copied Comparison" });
  }

  return (
    <Detail
      isLoading={!previewPath}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Clipboard}
            title="Copy Comparison"
            onAction={copySummary}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title={`Copy ${left.name}`}
            content={formatDimensions(left)}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title={`Copy ${right.name}`}
            content={formatDimensions(right)}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action.Push
            icon={Icon.Sidebar}
            title="Choose Another Comparison Size"
            target={
              <ComparePicker
                dpi={dpi}
                left={left}
                setDpi={setDpi}
                sizes={sizes}
                unit={unit}
              />
            }
          />
          <ActionPanel.Section title="DPI">
            <Action.Push
              icon={Icon.Gear}
              title="Set Custom DPI…"
              target={<DpiForm currentDpi={dpi} setDpi={setDpi} />}
            />
            {DPI_OPTIONS.map((option) => (
              <Action
                key={option}
                title={`Set DPI to ${option}`}
                icon={dpi === option ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setDpi(option)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Unit" text={unit} />
          <Detail.Metadata.Label title="DPI" text={dpi} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={left.name}
            text={formatDimensions(left)}
          />
          <Detail.Metadata.Label
            title={right.name}
            text={formatDimensions(right)}
          />
        </Detail.Metadata>
      }
    />
  );
}

function DpiForm({
  currentDpi,
  setDpi,
}: {
  currentDpi: string;
  setDpi: (dpi: string) => void;
}) {
  const [value, setValue] = useState(currentDpi);

  async function submit() {
    const numericDpi = Number(value);

    if (!Number.isFinite(numericDpi) || numericDpi <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid DPI",
        message: "Enter a positive number.",
      });
      return;
    }

    setDpi(String(numericDpi));
    await showToast({
      style: Toast.Style.Success,
      title: `DPI set to ${numericDpi}`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set DPI" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="dpi"
        title="DPI"
        placeholder="300"
        value={value}
        onChange={setValue}
      />
    </Form>
  );
}

async function loadPaperSizes(
  series: PaperSeries,
  unit: PaperUnit,
): Promise<PaperSize[]> {
  const seriesToLoad =
    series === "all"
      ? SERIES_OPTIONS.slice(1).map((option) => option.value)
      : [series];
  const results = await Promise.all(
    seriesToLoad.map(async (nextSeries) => {
      const { stdout } = await execFileAsync(getDelphitoolsCliPath(), [
        "paper",
        "--series",
        nextSeries,
        "--unit",
        unit,
        "--json",
      ]);
      const parsed = JSON.parse(stdout) as Array<Omit<PaperSize, "series">>;

      return parsed.map((size) => ({
        ...size,
        series: nextSeries as Exclude<PaperSeries, "all">,
      }));
    }),
  );

  return results.flat();
}

function getPixelSize(size: PaperSize, dpi: string): PaperSize {
  const numericDpi = Number(dpi) || Number(DEFAULT_DPI);

  return {
    height: convertToInches(size.height, size.unit) * numericDpi,
    name: size.name,
    series: size.series,
    unit: "px",
    width: convertToInches(size.width, size.unit) * numericDpi,
  };
}

function convertToInches(value: number, unit: PaperSize["unit"]): number {
  if (unit === "in") {
    return value;
  }

  if (unit === "pt") {
    return value / 72;
  }

  if (unit === "px") {
    return value;
  }

  return value / 25.4;
}

function formatDimensions(size: Pick<PaperSize, "height" | "unit" | "width">) {
  return `${formatNumber(size.width, size.unit)} x ${formatNumber(size.height, size.unit)} ${size.unit}`;
}

function formatNumber(value: number, unit: PaperSize["unit"]) {
  if (unit === "px") {
    return String(Math.round(value));
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getCompareMarkdown(
  left: PaperSize,
  right: PaperSize,
  dpi: string,
  previewPath: string,
) {
  const ratio = getComparisonRatio(left, right);
  const leftPixels = getPixelSize(left, dpi);
  const rightPixels = getPixelSize(right, dpi);

  return `# ${left.name} vs ${right.name}

${previewPath ? `![Paper comparison](${previewPath})` : ""}

| Size | Dimensions | Pixels at ${dpi} DPI | Aspect | Area |
| --- | --- | --- | --- | --- |
| ${left.name} | ${formatDimensions(left)} | ${formatDimensions(leftPixels)} | ${formatAspect(left)} | ${formatArea(left)} |
| ${right.name} | ${formatDimensions(right)} | ${formatDimensions(rightPixels)} | ${formatAspect(right)} | ${formatArea(right)} |

${right.name} is ${formatNumber(ratio.width, "in")}x as wide, ${formatNumber(ratio.height, "in")}x as tall, and ${formatNumber(ratio.area, "in")}x the area of ${left.name}.`;
}

function getCompareSummary(left: PaperSize, right: PaperSize, dpi: string) {
  const ratio = getComparisonRatio(left, right);

  return `${left.name}: ${formatDimensions(left)} (${formatDimensions(getPixelSize(left, dpi))})
${right.name}: ${formatDimensions(right)} (${formatDimensions(getPixelSize(right, dpi))})
${right.name} vs ${left.name}: ${formatNumber(ratio.width, "in")}x width, ${formatNumber(ratio.height, "in")}x height, ${formatNumber(ratio.area, "in")}x area`;
}

function getComparisonRatio(left: PaperSize, right: PaperSize) {
  return {
    area: (right.width * right.height) / (left.width * left.height),
    height: right.height / left.height,
    width: right.width / left.width,
  };
}

function formatAspect(size: PaperSize) {
  return `${formatNumber(size.width / size.height, "in")}:1`;
}

function formatArea(size: PaperSize) {
  return `${formatNumber(size.width * size.height, size.unit)} ${size.unit}2`;
}

async function writeComparisonSvg(left: PaperSize, right: PaperSize) {
  const directory = join(getDefaultOutputRoot(), "paper");
  const filePath = join(
    directory,
    `paper-${left.name.toLowerCase()}-${right.name.toLowerCase()}.svg`,
  );

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, getComparisonSvg(left, right), "utf8");

  return filePath;
}

function getComparisonSvg(left: PaperSize, right: PaperSize) {
  const canvasWidth = 720;
  const canvasHeight = 420;
  const maxPaperHeight = 300;
  const maxPaperWidth = 220;
  const scale = Math.min(
    maxPaperWidth / Math.max(left.width, right.width),
    maxPaperHeight / Math.max(left.height, right.height),
  );
  const leftWidth = left.width * scale;
  const leftHeight = left.height * scale;
  const rightWidth = right.width * scale;
  const rightHeight = right.height * scale;
  const leftX = 160 - leftWidth / 2;
  const rightX = 520 - rightWidth / 2;
  const baseY = 350;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">
  <line x1="60" y1="${baseY}" x2="660" y2="${baseY}" stroke="#d8d2c4" stroke-width="2"/>
  <rect x="${leftX}" y="${baseY - leftHeight}" width="${leftWidth}" height="${leftHeight}" rx="3" fill="#ffffff" stroke="#1f2937" stroke-width="3"/>
  <rect x="${rightX}" y="${baseY - rightHeight}" width="${rightWidth}" height="${rightHeight}" rx="3" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="160" y="384" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">${escapeSvg(left.name)}</text>
  <text x="520" y="384" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#1d4ed8">${escapeSvg(right.name)}</text>
</svg>`;
}

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
