import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  Toast,
  showToast,
  useNavigation,
  getPreferenceValues,
  showHUD,
} from '@raycast/api';
import { writeFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { useLocalStorage } from '@raycast/utils';
import React, { useMemo, useState, useEffect } from 'react';
import { Gradient } from './types';
import {
  pngDataUri,
  toCss,
  toSwiftUI,
  toTailwind,
  toSvg,
  generatePng,
  PNG_SIZE_PRESETS,
  randomHex,
} from './lib/grad';

type Props = Partial<Gradient> & {
  additionalActions?: React.ReactNode;
  isRandomGradient?: boolean;
  onGenerateRandom?: (stopCount?: 2 | 3) => void;
};

type Preferences = {
  svgExportDirectory: string;
  pngExportDirectory: string;
  tailwindOutputMode: 'utility' | 'css';
};

const ensureDefaults = (g?: Props): Gradient => ({
  type: g?.type ?? 'linear',
  angle: g?.angle ?? 90,
  stops: g?.stops ?? ['#ff0000', '#00ff00'],
  label: g?.label,
});

export default function PreviewGradient(props: Props) {
  const {
    additionalActions,
    isRandomGradient,
    onGenerateRandom,
    ...gradientProps
  } = props;
  const initial = ensureDefaults(gradientProps);
  const [gradient, setGradient] = useState<Gradient>(initial);

  // Get Tailwind output mode from preferences
  const preferences = getPreferenceValues<Preferences>();
  const tailwindMode = preferences.tailwindOutputMode === 'utility';

  // Sync internal state with props changes
  useEffect(() => {
    if (
      gradientProps.type ||
      gradientProps.angle !== undefined ||
      gradientProps.stops
    ) {
      const newGradient = ensureDefaults(gradientProps);
      setGradient(newGradient);
    }
  }, [gradientProps.type, gradientProps.angle, gradientProps.stops]);

  const { value: saved = [], setValue: setSaved } = useLocalStorage<Gradient[]>(
    'saved-gradients',
    [],
  );

  const hasEnoughStops = gradient.stops.length >= 2;

  // Prefer PNG for Raycast markdown reliability
  const png = useMemo(() => pngDataUri(gradient, 800, 480), [gradient]);
  const css = useMemo(() => toCss(gradient), [gradient]);
  const swift = useMemo(() => toSwiftUI(gradient), [gradient]);
  const svg = useMemo(() => toSvg(gradient, 800, 480), [gradient]);

  // Tailwind output based on preference
  const tailwindOutput = useMemo(() => {
    if (tailwindMode) {
      return toTailwind(gradient);
    } else {
      // Raw CSS output for Tailwind section
      return toCss(gradient);
    }
  }, [gradient, tailwindMode]);

  const markdown = `# Gradient Preview\n\n![Gradient](${png})\n\n## CSS\n\n\`\`\`css\n${css}\n\`\`\`\n\n## SwiftUI\n\n\`\`\`swift\n${swift}\n\`\`\`\n\n## Tailwind\n\n\`\`\`${tailwindMode ? 'txt' : 'css'}\n${tailwindOutput}\n\`\`\``;

  const onSave = async () => {
    const next = [...saved, gradient];
    await setSaved(next);
    await showToast({ style: Toast.Style.Success, title: 'Saved Gradient' });
  };

  const onAddStop = () => {
    setGradient((g) => ({ ...g, stops: [...g.stops, randomHex()] }));
  };

  const onRename = async (newLabel: string) => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Label cannot be empty',
      });
      return;
    }

    // Find the gradient in saved list to update it
    const savedIndex = saved.findIndex(
      (g) =>
        g.type === gradient.type &&
        g.angle === gradient.angle &&
        JSON.stringify(g.stops) === JSON.stringify(gradient.stops),
    );

    if (savedIndex !== -1) {
      // Check for name collisions
      const existingIndex = saved.findIndex(
        (g, i) => i !== savedIndex && g.label === trimmedLabel,
      );
      if (existingIndex !== -1) {
        const ok = await confirmAlert({
          title: 'Name Already Exists',
          message: `A gradient with the label "${trimmedLabel}" already exists. Do you want to overwrite it?`,
          primaryAction: {
            title: 'Overwrite',
            style: Alert.ActionStyle.Destructive,
          },
          dismissAction: { title: 'Cancel' },
        });
        if (!ok) return;
      }

      const next = [...saved];
      next[savedIndex] = { ...next[savedIndex], label: trimmedLabel };
      await setSaved(next);
      await showToast({
        style: Toast.Style.Success,
        title: 'Gradient renamed',
      });
    }
  };

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Type / Angle">
            <Detail.Metadata.TagList.Item text={gradient.type} />
            {gradient.type === 'linear' ? (
              <Detail.Metadata.TagList.Item text={`${gradient.angle}°`} />
            ) : null}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Stops">
            {gradient.stops.map((c, idx) => (
              <Detail.Metadata.TagList.Item
                key={`${idx}-${c}`}
                text={c}
                color={c}
              />
            ))}
          </Detail.Metadata.TagList>
          {!hasEnoughStops ? (
            <Detail.Metadata.Label
              title="Note"
              text="At least two color stops are required."
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Size" text="800 × 480" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Tailwind Output"
            text={tailwindMode ? 'Utility Classes' : 'Raw CSS'}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <>
            {additionalActions}
            {isRandomGradient && onGenerateRandom && (
              <ActionPanel.Section title="Generate New Gradient">
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Random (Any)"
                  onAction={() => onGenerateRandom()}
                  shortcut={
                    { modifiers: ['cmd'], key: 'r' } as Keyboard.Shortcut
                  }
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Random (2 Stops)"
                  onAction={() => onGenerateRandom(2)}
                  shortcut={
                    { modifiers: ['cmd'], key: '2' } as Keyboard.Shortcut
                  }
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Random (3 Stops)"
                  onAction={() => onGenerateRandom(3)}
                  shortcut={
                    { modifiers: ['cmd'], key: '3' } as Keyboard.Shortcut
                  }
                />
              </ActionPanel.Section>
            )}
            <Action
              icon={Icon.Plus}
              title="Add Color Stop"
              onAction={onAddStop}
              shortcut={
                { modifiers: ['cmd', 'shift'], key: 'n' } as Keyboard.Shortcut
              }
            />
            <Action
              icon={Icon.Folder}
              title="Save Gradient"
              onAction={onSave}
            />
            <Action.Push
              icon={Icon.TextCursor}
              title="Save With Label"
              shortcut={{ modifiers: ['cmd'], key: 'l' } as Keyboard.Shortcut}
              target={
                <LabelGradient
                  initial={gradient}
                  onSave={async (g) => {
                    const next = [...saved, g];
                    await setSaved(next);
                    await showToast({
                      style: Toast.Style.Success,
                      title: 'Saved with Label',
                    });
                  }}
                />
              }
            />
            {saved.some(
              (g) =>
                g.type === gradient.type &&
                g.angle === gradient.angle &&
                JSON.stringify(g.stops) === JSON.stringify(gradient.stops),
            ) && (
              <Action.Push
                icon={Icon.Text}
                title="Rename Gradient"
                shortcut={
                  { modifiers: ['cmd', 'shift'], key: 'r' } as Keyboard.Shortcut
                }
                target={
                  <QuickRenameForm
                    initialLabel={gradient.label}
                    onSubmit={onRename}
                  />
                }
              />
            )}
            {hasEnoughStops && (
              <>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy CSS"
                    content={css}
                    shortcut={
                      {
                        modifiers: ['cmd', 'shift'],
                        key: 'c',
                      } as Keyboard.Shortcut
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy SwiftUI"
                    content={swift}
                    shortcut={
                      {
                        modifiers: ['cmd', 'shift'],
                        key: 's',
                      } as Keyboard.Shortcut
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Tailwind"
                    content={tailwindOutput}
                    shortcut={
                      {
                        modifiers: ['cmd', 'shift'],
                        key: 't',
                      } as Keyboard.Shortcut
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy SVG"
                    content={svg}
                    shortcut={
                      {
                        modifiers: ['cmd', 'shift'],
                        key: 'v',
                      } as Keyboard.Shortcut
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Export Gradient">
                  <Action.Push
                    icon={Icon.Download}
                    title="Save as SVG..."
                    target={
                      <SvgExportForm
                        gradient={gradient}
                        onExport={async (svgContent, filename) => {
                          try {
                            // Check if export directory preference is set
                            if (!preferences.svgExportDirectory?.trim()) {
                              await showToast({
                                style: Toast.Style.Failure,
                                title: 'Export Directory Not Set',
                                message:
                                  'Please set the SVG Export Directory preference in Raycast settings first.',
                              });
                              return;
                            }

                            // Get export directory from preferences
                            const exportDir = preferences.svgExportDirectory;

                            // The file picker returns a full path, so we can use it directly
                            const expandedPath = exportDir;

                            // Check if directory exists and is writable, create if needed
                            try {
                              await access(expandedPath);
                            } catch {
                              // Directory doesn't exist, try to create it
                              await mkdir(expandedPath, { recursive: true });
                            }

                            const filePath = join(expandedPath, filename);

                            await writeFile(filePath, svgContent, 'utf8');

                            // Show success HUD
                            await showHUD(
                              `SVG saved to ${exportDir}/${filename}`,
                            );
                          } catch (error) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: 'Failed to save SVG',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Unknown error',
                            });
                          }
                        }}
                      />
                    }
                  />
                  <Action.Push
                    icon={Icon.Download}
                    title="Save as PNG..."
                    target={
                      <PngExportForm
                        gradient={gradient}
                        onExport={async (pngBuffer, filename) => {
                          try {
                            // Check if export directory preference is set
                            if (!preferences.pngExportDirectory?.trim()) {
                              await showToast({
                                style: Toast.Style.Failure,
                                title: 'Export Directory Not Set',
                                message:
                                  'Please set the PNG Export Directory preference in Raycast settings first.',
                              });
                              return;
                            }

                            // Get export directory from preferences
                            const exportDir = preferences.pngExportDirectory;

                            // The directory picker returns a full path, so we can use it directly
                            const expandedPath = exportDir;

                            // Check if directory exists and is writable, create if needed
                            try {
                              await access(expandedPath);
                            } catch {
                              // Directory doesn't exist, try to create it
                              await mkdir(expandedPath, { recursive: true });
                            }

                            const filePath = join(expandedPath, filename);

                            await writeFile(filePath, pngBuffer);

                            // Show success HUD
                            await showHUD(
                              `PNG saved to ${exportDir}/${filename}`,
                            );
                          } catch (error) {
                            await showToast({
                              style: Toast.Style.Failure,
                              title: 'Failed to save PNG',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Unknown error',
                            });
                          }
                        }}
                      />
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Paste into Active App">
                  <Action.Paste
                    title="Paste CSS"
                    content={css}
                    shortcut={
                      {
                        modifiers: ['cmd', 'opt'],
                        key: 'c',
                      } as Keyboard.Shortcut
                    }
                  />
                  <Action.Paste
                    title="Paste SwiftUI"
                    content={swift}
                    shortcut={
                      {
                        modifiers: ['cmd', 'opt'],
                        key: 's',
                      } as Keyboard.Shortcut
                    }
                  />
                  <Action.Paste
                    title="Paste Tailwind"
                    content={tailwindOutput}
                    shortcut={
                      {
                        modifiers: ['cmd', 'opt'],
                        key: 't',
                      } as Keyboard.Shortcut
                    }
                  />
                  <Action.Paste
                    title="Paste SVG"
                    content={svg}
                    shortcut={
                      {
                        modifiers: ['cmd', 'opt'],
                        key: 'v',
                      } as Keyboard.Shortcut
                    }
                  />
                </ActionPanel.Section>
              </>
            )}
          </>
        </ActionPanel>
      }
    />
  );
}

type LabelGradientProps = {
  initial: Gradient;
  onSave: (g: Gradient) => Promise<void>;
};

function LabelGradient({ initial, onSave }: LabelGradientProps) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState<string>('');
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Save"
            icon={Icon.Folder}
            onAction={async () => {
              await onSave({ ...initial, label: label.trim() || undefined });
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Set a label for this gradient (optional)." />
      <Form.TextField
        id="label"
        title="Label"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Sunset, Brand Accent"
      />
    </Form>
  );
}

type QuickRenameFormProps = {
  initialLabel?: string;
  onSubmit: (label: string) => Promise<void>;
};

function QuickRenameForm({ initialLabel, onSubmit }: QuickRenameFormProps) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState<string>(initialLabel ?? '');
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Rename"
            icon={Icon.Text}
            onAction={async () => {
              await onSubmit(label);
              pop();
            }}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Rename this gradient." />
      <Form.TextField
        id="label"
        title="New Label"
        value={label}
        onChange={setLabel}
        placeholder="e.g. Sunset, Brand Accent"
      />
    </Form>
  );
}

type SvgExportFormProps = {
  gradient: Gradient;
  onExport: (svgContent: string, filename: string) => Promise<void>;
};

function SvgExportForm({ gradient, onExport }: SvgExportFormProps) {
  const { pop } = useNavigation();
  const [width, setWidth] = useState<string>('800');
  const [height, setHeight] = useState<string>('400');
  const [preserveAspectRatio, setPreserveAspectRatio] =
    useState<string>('xMidYMid slice');
  const [filename, setFilename] = useState<string>('gradient.svg');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async () => {
    // Validate form data
    const numWidth = parseInt(width, 10);
    const numHeight = parseInt(height, 10);

    if (
      isNaN(numWidth) ||
      isNaN(numHeight) ||
      numWidth <= 0 ||
      numHeight <= 0
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid dimensions',
        message: 'Width and height must be positive numbers',
      });
      return;
    }

    // Validate filename
    if (!filename.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid filename',
        message: 'Filename cannot be empty',
      });
      return;
    }

    // Generate SVG
    const svgContent = toSvg(
      gradient,
      numWidth,
      numHeight,
      preserveAspectRatio,
    );

    // Show progress toast first, then export
    await showToast({
      style: Toast.Style.Animated,
      title: 'Generating SVG...',
      message: 'Please wait while the file is being created',
    });

    // Set exporting state to show loading
    setIsExporting(true);

    // Call export function
    await onExport(svgContent, filename);

    // Close form after export completes
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={isExporting ? 'Generating SVG...' : 'Save SVG with Settings'}
            icon={isExporting ? Icon.Clock : Icon.Download}
            onAction={handleExport}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure SVG export settings. The SVG will be saved to your configured export directory with the specified filename." />

      <Form.TextField
        id="width"
        title="Width"
        value={width}
        onChange={setWidth}
        placeholder="800"
      />

      <Form.TextField
        id="height"
        title="Height"
        value={height}
        onChange={setHeight}
        placeholder="400"
      />

      <Form.Dropdown
        id="preserveAspectRatio"
        title="Preserve Aspect Ratio"
        value={preserveAspectRatio}
        onChange={setPreserveAspectRatio}
      >
        <Form.Dropdown.Item
          value="xMidYMid slice"
          title="Slice (crop to fit)"
        />
        <Form.Dropdown.Item
          value="xMidYMid meet"
          title="Meet (fit within bounds)"
        />
        <Form.Dropdown.Item value="none" title="None (stretch)" />
      </Form.Dropdown>

      <Form.TextField
        id="filename"
        title="Filename"
        value={filename}
        onChange={setFilename}
        placeholder="gradient.svg"
      />

      {isExporting && (
        <Form.Description text="🔄 Generating SVG... Please wait while the file is being created." />
      )}
    </Form>
  );
}

type PngExportFormProps = {
  gradient: Gradient;
  onExport: (pngBuffer: Buffer, filename: string) => Promise<void>;
};

function PngExportForm({ gradient, onExport }: PngExportFormProps) {
  const { pop } = useNavigation();
  const [selectedPreset, setSelectedPreset] = useState<string>('1');
  const [customWidth, setCustomWidth] = useState<string>('1920');
  const [customHeight, setCustomHeight] = useState<string>('1080');
  const [dpr, setDpr] = useState<string>('2');
  const [transparentBackground, setTransparentBackground] =
    useState<boolean>(false);
  const [filename, setFilename] = useState<string>('gradient.png');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async () => {
    // Validate form data
    let width: number, height: number;

    if (selectedPreset === 'custom') {
      const numWidth = parseInt(customWidth, 10);
      const numHeight = parseInt(customHeight, 10);

      if (
        isNaN(numWidth) ||
        isNaN(numHeight) ||
        numWidth <= 0 ||
        numHeight <= 0
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Invalid dimensions',
          message: 'Width and height must be positive numbers',
        });
        return;
      }
      width = numWidth;
      height = numHeight;
    } else {
      const presetIndex = parseInt(selectedPreset, 10);
      const preset = PNG_SIZE_PRESETS[presetIndex];
      width = preset.width;
      height = preset.height;
    }

    // Validate DPR
    const dprValue = parseInt(dpr, 10);
    if (isNaN(dprValue) || dprValue <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid DPR',
        message: 'Device Pixel Ratio must be a positive number',
      });
      return;
    }

    // Validate filename
    if (!filename.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Invalid filename',
        message: 'Filename cannot be empty',
      });
      return;
    }

    // Generate PNG
    const pngBuffer = generatePng(
      gradient,
      width,
      height,
      dprValue,
      transparentBackground,
    );

    // Set exporting state to show loading
    setIsExporting(true);

    // Call export function
    await onExport(pngBuffer, filename);

    // Close form after export completes
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={isExporting ? 'Generating PNG...' : 'Export PNG'}
            icon={isExporting ? Icon.Clock : Icon.Download}
            onAction={handleExport}
          />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure PNG export settings. The PNG will be saved to your configured export directory with the specified filename." />

      <Form.Dropdown
        id="preset"
        title="Size Preset"
        value={selectedPreset}
        onChange={setSelectedPreset}
      >
        {PNG_SIZE_PRESETS.map((preset, index) => (
          <Form.Dropdown.Item
            key={index}
            title={preset.name}
            value={index.toString()}
          />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom..." />
      </Form.Dropdown>

      {selectedPreset === 'custom' && (
        <>
          <Form.TextField
            id="customWidth"
            title="Width"
            value={customWidth}
            onChange={setCustomWidth}
            placeholder="1920"
          />

          <Form.TextField
            id="customHeight"
            title="Height"
            value={customHeight}
            onChange={setCustomHeight}
            placeholder="1080"
          />
        </>
      )}

      <Form.Dropdown
        id="dpr"
        title="Device Pixel Ratio (DPR)"
        value={dpr}
        onChange={setDpr}
      >
        <Form.Dropdown.Item value="1" title="1× (Standard)" />
        <Form.Dropdown.Item value="2" title="2× (Retina - Default)" />
      </Form.Dropdown>

      <Form.Checkbox
        id="transparentBackground"
        title="Transparent Background"
        value={transparentBackground}
        onChange={setTransparentBackground}
        label="Make background transparent instead of white"
      />

      <Form.TextField
        id="filename"
        title="Filename"
        value={filename}
        onChange={setFilename}
        placeholder="gradient.png"
      />

      {isExporting && (
        <Form.Description text="🔄 Generating PNG... Please wait while the image is being created." />
      )}
    </Form>
  );
}
