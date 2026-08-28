import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
import { getDefaultOutputRoot } from "./utils/preferences";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { useState } from "react";

import { DelphitoolsRequired } from "./delphitools-install";

type Layout = "saddle-stitch" | "perfect-bind" | "n-up";

type FormValues = {
  pdf: string[];
  layout: Layout;
  paper: string;
  nUp: string;
  signature: string;
  margins: string;
  gutter: string;
  creep: string;
  cropMarks: boolean;
  duplex: boolean;
};

type ImposeResult = {
  outputPath: string;
  size: number;
  layout: Layout;
};

const OUTPUT_NAMESPACE = "impose";
const DEFAULT_PAPER = "a4";
const DEFAULT_N_UP = "4";
const DEFAULT_SIGNATURE = "16";
const DEFAULT_MARGINS = "10";
const DEFAULT_GUTTER = "5";
const DEFAULT_CREEP = "0";

const LAYOUTS: Array<{ label: string; value: Layout; description: string }> = [
  {
    label: "2-up Saddle Stitch",
    value: "saddle-stitch",
    description: "Booklet spreads for folded, stapled printing.",
  },
  {
    label: "2-up Perfect Bind",
    value: "perfect-bind",
    description: "Signature spreads for glued book blocks.",
  },
  {
    label: "N-up Gang Run",
    value: "n-up",
    description: "Multiple pages tiled on each output sheet.",
  },
];

const PAPER_SIZES = ["a4", "a3", "letter", "legal", "tabloid"];

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <ImposeForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function ImposeForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();
  const [layout, setLayout] = useState<Layout>("saddle-stitch");

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Document}
            title="Impose PDF"
            onSubmit={async (values) => {
              const validationError = validateFormValues(values);

              if (validationError) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: validationError.title,
                  message: validationError.message,
                });
                return;
              }

              try {
                const result = await runImpose(values);

                await showToast({
                  style: Toast.Style.Success,
                  title: "PDF imposed",
                  message: path.basename(result.outputPath),
                });

                push(<ImposeResultDetail result={result} />);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);

                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not impose PDF",
                  message,
                });
              }
            }}
          />
          <Action.Push
            icon={Icon.Eye}
            title="Show Layout Preview"
            target={<LayoutPreview layout={layout} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={getLayoutPreviewText(layout)} />
      <Form.FilePicker
        id="pdf"
        title="PDF"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Dropdown
        id="layout"
        title="Layout"
        value={layout}
        onChange={(value) => setLayout(value as Layout)}
      >
        {LAYOUTS.map((layoutOption) => (
          <Form.Dropdown.Item
            key={layoutOption.value}
            title={layoutOption.label}
            value={layoutOption.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="paper" title="Paper" defaultValue={DEFAULT_PAPER}>
        {PAPER_SIZES.map((paper) => (
          <Form.Dropdown.Item
            key={paper}
            title={paper.toUpperCase()}
            value={paper}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField id="nUp" title="N-up Count" defaultValue={DEFAULT_N_UP} />
      <Form.TextField
        id="signature"
        title="Signature Size"
        defaultValue={DEFAULT_SIGNATURE}
      />
      <Form.TextField
        id="margins"
        title="Margins"
        defaultValue={DEFAULT_MARGINS}
        placeholder="mm"
      />
      <Form.TextField
        id="gutter"
        title="Gutter"
        defaultValue={DEFAULT_GUTTER}
        placeholder="mm"
      />
      <Form.TextField
        id="creep"
        title="Creep"
        defaultValue={DEFAULT_CREEP}
        placeholder="mm"
      />
      <Form.Checkbox
        id="cropMarks"
        title="Crop Marks"
        label="Draw crop marks"
      />
      <Form.Checkbox
        id="duplex"
        title="Duplex"
        label="Add duplex back-sheet pages"
      />
    </Form>
  );
}

function ImposeResultDetail({ result }: { result: ImposeResult }) {
  const layoutTitle = getLayoutLabel(result.layout);

  return (
    <Detail
      markdown={`# Imposed PDF Ready

${layoutTitle}

\`${result.outputPath}\`
`}
      actions={<ImposeResultActions result={result} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Layout" text={layoutTitle} />
          <Detail.Metadata.Label
            title="File"
            text={path.basename(result.outputPath)}
          />
          <Detail.Metadata.Label
            title="Size"
            text={formatFileSize(result.size)}
          />
        </Detail.Metadata>
      }
    />
  );
}

function ImposeResultActions({ result }: { result: ImposeResult }) {
  return (
    <ActionPanel>
      <Action.Open
        icon={Icon.Eye}
        title="Open Imposed PDF"
        target={result.outputPath}
      />
      <Action
        icon={Icon.Clipboard}
        title="Copy Imposed PDF"
        onAction={async () => {
          await Clipboard.copy({ file: result.outputPath });
          await showToast({
            style: Toast.Style.Success,
            title: "Copied Imposed PDF",
          });
        }}
      />
      <Action.CopyToClipboard
        title="Copy Imposed PDF Path"
        content={result.outputPath}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.ShowInFinder
        title="Reveal in Finder"
        path={result.outputPath}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}

function LayoutPreview({ layout }: { layout: Layout }) {
  return (
    <Detail
      markdown={`# ${getLayoutLabel(layout)}

![${getLayoutLabel(layout)} preview](${getLayoutPreviewDataUri(layout)})

${getLayoutDescription(layout)}
`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="CLI Layout" text={layout} />
          <Detail.Metadata.Label title="Output" text="PDF" />
        </Detail.Metadata>
      }
    />
  );
}

async function runImpose(values: FormValues): Promise<ImposeResult> {
  const inputPath = values.pdf[0];
  const outputRoot = getDefaultOutputRoot();
  const outputDirectory = path.join(
    outputRoot,
    OUTPUT_NAMESPACE,
    `${Date.now()}`,
  );
  const outputPath = path.join(
    outputDirectory,
    `${path.basename(inputPath, path.extname(inputPath))}-imposed.pdf`,
  );
  const args = [
    "impose",
    "--quiet",
    "--layout",
    values.layout,
    "--paper",
    values.paper,
    "--n-up",
    values.nUp.trim(),
    "--signature",
    values.signature.trim(),
    "--margins",
    values.margins.trim(),
    "--gutter",
    values.gutter.trim(),
    "--creep",
    values.creep.trim(),
  ];

  if (values.cropMarks) {
    args.push("--crop-marks");
  }

  if (values.duplex) {
    args.push("--duplex");
  }

  args.push("--output", outputPath, inputPath);

  await mkdir(outputDirectory, { recursive: true });
  await execFileAsync(getDelphitoolsCliPath(), args);

  const outputStat = await stat(outputPath);

  if (!outputStat.isFile() || outputStat.size === 0) {
    throw new Error("delphitools did not generate an imposed PDF.");
  }

  return {
    outputPath,
    size: outputStat.size,
    layout: values.layout,
  };
}

function validateFormValues(values: FormValues): {
  title: string;
  message?: string;
} | null {
  if (!values.pdf?.length) {
    return { title: "Choose a PDF" };
  }

  if (!isPdfPath(values.pdf[0])) {
    return {
      title: "Unsupported file type",
      message: "Choose a PDF file.",
    };
  }

  const wholeNumberFields = [
    { label: "N-up count", value: values.nUp, min: 1 },
    { label: "Signature size", value: values.signature, min: 1 },
  ];
  const decimalFields = [
    { label: "Margins", value: values.margins, min: 0 },
    { label: "Gutter", value: values.gutter, min: 0 },
    { label: "Creep", value: values.creep, min: 0 },
  ];

  for (const field of wholeNumberFields) {
    const value = Number(field.value.trim());

    if (!Number.isInteger(value) || value < field.min) {
      return {
        title: `${field.label} must be ${field.min} or greater`,
        message: "Enter a whole number.",
      };
    }
  }

  for (const field of decimalFields) {
    const value = Number(field.value.trim());

    if (!Number.isFinite(value) || value < field.min) {
      return {
        title: `${field.label} must be ${field.min} or greater`,
        message: "Enter a number in millimeters.",
      };
    }
  }

  return null;
}

function isPdfPath(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".pdf";
}

function getLayoutLabel(layout: Layout): string {
  return (
    LAYOUTS.find((layoutOption) => layoutOption.value === layout)?.label ??
    layout
  );
}

function getLayoutDescription(layout: Layout): string {
  return (
    LAYOUTS.find((layoutOption) => layoutOption.value === layout)
      ?.description ?? ""
  );
}

function getLayoutPreviewText(layout: Layout): string {
  if (layout === "n-up") {
    return "Preview: a press sheet with a tidy page grid for gang-run n-up output.";
  }

  if (layout === "perfect-bind") {
    return "Preview: paired spreads grouped into signatures for perfect binding.";
  }

  return "Preview: paired spreads arranged for fold-and-staple saddle stitching.";
}

function getLayoutPreviewDataUri(layout: Layout): string {
  const svg = getLayoutPreviewSvg(layout);

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getLayoutPreviewSvg(layout: Layout): string {
  const pages =
    layout === "n-up"
      ? [
          [86, 74, 152, 182, "1"],
          [262, 74, 152, 182, "2"],
          [86, 280, 152, 182, "3"],
          [262, 280, 152, 182, "4"],
        ]
      : [
          [82, 120, 170, 272, layout === "perfect-bind" ? "16" : "4"],
          [260, 120, 170, 272, layout === "perfect-bind" ? "1" : "1"],
        ];
  const foldLine =
    layout === "n-up"
      ? '<path d="M256 60V476M64 268H448" stroke="#3B503E" stroke-width="4" stroke-dasharray="10 12"/>'
      : '<path d="M256 100V412" stroke="#3B503E" stroke-width="5" stroke-dasharray="10 12"/>';
  const pageMarkup = pages
    .map(
      ([x, y, width, height, label]) => `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="#FFFFFF" stroke="#06490E" stroke-width="7"/>
        <text x="${Number(x) + Number(width) / 2}" y="${Number(y) + Number(height) / 2 + 12}" fill="#06490E" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="700" text-anchor="middle">${label}</text>
      `,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 540">
    <rect width="512" height="540" rx="26" fill="#F7F2E3"/>
    <rect x="48" y="48" width="416" height="452" rx="18" fill="#E7DBBB" stroke="#06490E" stroke-width="6"/>
    ${foldLine}
    ${pageMarkup}
    <text x="256" y="522" fill="#06490E" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle">${getLayoutLabel(layout)}</text>
  </svg>`;
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${bytes} B`;
  }

  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}
