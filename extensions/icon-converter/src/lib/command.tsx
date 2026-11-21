import {
  Action,
  ActionPanel,
  environment,
  Form,
  getSelectedFinderItems,
  Icon,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import { setAssetsDir } from "./assets";
import { accepts, convertFile } from "./convert";
import type { ConvertOptions, InputFormat, OutputFormat } from "./types";

setAssetsDir(environment.assetsPath);

interface Values {
  files: string[];
  quality?: string;
  background?: string;
  colors?: string;
  width?: string;
}

const BACKGROUNDS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
};

export function ConvertCommand({ from, to }: { from: InputFormat; to: OutputFormat }) {
  const [files, setFiles] = useState<string[]>([]);
  const [filesError, setFilesError] = useState<string>();
  const [widthError, setWidthError] = useState<string>();
  const askWidth = Boolean(from.vector && to.sizable);

  // Start with whatever matching files are selected in Finder / File Explorer.
  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        const matching = items.map((item) => item.path).filter((file) => accepts(from, file));
        if (matching.length > 0) setFiles((current) => (current.length > 0 ? current : matching));
      })
      .catch(() => {
        // File manager not frontmost or nothing selected: the picker stays empty.
      });
  }, []);

  async function submit(values: Values) {
    const inputs = values.files ?? [];
    if (inputs.length === 0) {
      setFilesError(`Choose at least one ${from.label} file`);
      return;
    }
    const wrong = inputs.filter((file) => !accepts(from, file));
    if (wrong.length > 0) {
      setFilesError(`Not ${from.label}: ${wrong.map((file) => path.basename(file)).join(", ")}`);
      return;
    }

    const options: ConvertOptions = {};
    if (values.quality) options.quality = values.quality === "lossless" ? "lossless" : Number(values.quality);
    if (values.background) options.background = BACKGROUNDS[values.background];
    if (values.colors) options.colors = Number(values.colors);
    if (askWidth && values.width?.trim()) {
      const width = Number(values.width.trim());
      if (!Number.isInteger(width) || width < 1 || width > 8192) {
        setWidthError("Enter a whole number from 1 to 8192, or leave empty");
        return;
      }
      options.width = width;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `Converting to ${to.label}…` });
    const outputs: string[] = [];
    const failures: string[] = [];
    for (const [i, file] of inputs.entries()) {
      if (inputs.length > 1) toast.message = `${i + 1} of ${inputs.length}: ${path.basename(file)}`;
      try {
        outputs.push(await convertFile(file, from, to, options));
      } catch (error) {
        failures.push(`${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (outputs.length > 0) {
      toast.primaryAction = {
        title: process.platform === "win32" ? "Show in File Explorer" : "Show in Finder",
        onAction: () => showInFinder(outputs[0]),
      };
    }
    if (failures.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = outputs.length === 1 ? `Saved ${path.basename(outputs[0])}` : `Converted ${outputs.length} files`;
      toast.message = outputs.length === 1 ? path.dirname(outputs[0]) : "Saved next to the originals";
      setFiles([]);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = outputs.length > 0 ? `Converted ${outputs.length}, ${failures.length} failed` : "Conversion failed";
      toast.message = failures.join("\n");
    }
  }

  return (
    <Form
      navigationTitle={`${from.label} to ${to.label}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Convert to ${to.label}`} icon={Icon.Switch} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title={`${from.label} Files`}
        allowMultipleSelection
        canChooseDirectories={false}
        value={files}
        error={filesError}
        onChange={(next) => {
          setFiles(next);
          setFilesError(undefined);
        }}
      />

      {askWidth && (
        <Form.TextField
          id="width"
          title="Width (px)"
          placeholder="Original size"
          info="Render the SVG at this width. Height follows the aspect ratio."
          error={widthError}
          onChange={() => setWidthError(undefined)}
        />
      )}

      {to.options.includes("quality") && (
        <Form.Dropdown id="quality" title="Quality" defaultValue={to.id === "webp" ? "85" : "90"}>
          {to.id === "webp" && <Form.Dropdown.Item value="lossless" title="Lossless" />}
          <Form.Dropdown.Item value="100" title="Maximum (100)" />
          <Form.Dropdown.Item value="90" title="High (90)" />
          <Form.Dropdown.Item value="85" title="Good (85)" />
          <Form.Dropdown.Item value="75" title="Medium (75)" />
          <Form.Dropdown.Item value="60" title="Small file (60)" />
        </Form.Dropdown>
      )}

      {to.options.includes("background") && (
        <Form.Dropdown
          id="background"
          title="Background"
          defaultValue="white"
          info={`${to.label} has no transparency, so transparent areas are filled with this colour.`}
        >
          <Form.Dropdown.Item value="white" title="White" />
          <Form.Dropdown.Item value="black" title="Black" />
        </Form.Dropdown>
      )}

      {to.options.includes("colors") && (
        <Form.Dropdown
          id="colors"
          title="Colours"
          defaultValue="16"
          info="Tracing redraws the image as flat colour shapes. Fewer colours give cleaner, smaller SVGs; works best on logos and icons, not photos."
        >
          {["2", "4", "8", "16", "32", "64"].map((n) => (
            <Form.Dropdown.Item key={n} value={n} title={n} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Description text="The converted file is saved next to the original. Nothing leaves your computer." />
    </Form>
  );
}
