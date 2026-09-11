import { execFileAsync, getDelphitoolsCliPath } from "./utils/exec";
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
import { stat } from "node:fs/promises";
import path from "node:path";

import { DelphitoolsRequired } from "./delphitools-install";

interface Box4 {
  width_mm: number;
  height_mm: number;
  width_pt?: number;
  height_pt?: number;
}

interface PageBox {
  width_mm: number;
  height_mm: number;
  width_pt: number;
  height_pt: number;
}

interface PageReport {
  page: number;
  media_box: PageBox | null;
  trim_box: Box4 | null;
  bleed_box: Box4 | null;
  rotation: number;
  image_count: number;
  image_dpis: number[];
  transparency: boolean;
  spot_colour_spaces: string[];
}

interface FontReport {
  name: string;
  subtype: string;
  embedded: boolean;
}

interface PreflightReport {
  file: string;
  pdf_version: string;
  page_count: number;
  encrypted: boolean;
  pages: PageReport[];
  fonts: FontReport[];
  warnings: string[];
}

type FormValues = {
  pdf: string[];
};

export default function Command() {
  return (
    <DelphitoolsRequired>
      {({ isCheckingInstall }) => (
        <PreflightForm isCheckingInstall={isCheckingInstall} />
      )}
    </DelphitoolsRequired>
  );
}

function PreflightForm({ isCheckingInstall }: { isCheckingInstall: boolean }) {
  const { push } = useNavigation();

  return (
    <Form
      isLoading={isCheckingInstall}
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            icon={Icon.Play}
            title="Run PDF Preflight"
            onSubmit={async (values) => {
              if (!values.pdf?.length) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose a PDF file",
                });
                return;
              }

              const pdfPath = values.pdf[0];
              if (path.extname(pdfPath).toLowerCase() !== ".pdf") {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Unsupported file type",
                  message: "Choose a PDF file.",
                });
                return;
              }

              try {
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Running preflight check...",
                });

                const fileStat = await stat(pdfPath);
                const report = await runPreflight(pdfPath);

                await showToast({
                  style: Toast.Style.Success,
                  title: "Preflight complete",
                });

                push(
                  <PreflightDetail
                    report={report}
                    pdfPath={pdfPath}
                    fileSize={fileStat.size}
                  />,
                );
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Preflight failed",
                  message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="pdf"
        title="PDF File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
      <Form.Description text="Choose one PDF file to analyze for print-readiness." />
    </Form>
  );
}

function PreflightDetail({
  report,
  pdfPath,
  fileSize,
}: {
  report: PreflightReport;
  pdfPath: string;
  fileSize: number;
}) {
  const markdownReport = generateMarkdownReport(report, pdfPath, fileSize);

  const totalWarnings = report.warnings.length;
  let statusText = "Ready for Print";
  let statusIcon = Icon.CheckCircle;
  if (report.encrypted) {
    statusText = "Encrypted / Restricted";
    statusIcon = Icon.XMarkCircle;
  } else if (totalWarnings > 0) {
    statusText = `${totalWarnings} Warning${totalWarnings > 1 ? "s" : ""} Found`;
    statusIcon = Icon.Info;
  }

  return (
    <Detail
      markdown={markdownReport}
      actions={
        <ActionPanel>
          <Action.Open icon={Icon.Eye} title="Open PDF" target={pdfPath} />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Report"
            content={markdownReport}
          />
          <Action
            icon={Icon.Code}
            title="Copy JSON"
            onAction={async () => {
              await Clipboard.copy(JSON.stringify(report, null, 2));
              await showToast({
                style: Toast.Style.Success,
                title: "Copied JSON Report",
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          />
          <Action.ShowInFinder
            title="Reveal in Finder"
            path={pdfPath}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={statusText}
            icon={statusIcon}
          />
          <Detail.Metadata.Label title="File" text={path.basename(pdfPath)} />
          <Detail.Metadata.Label
            title="File Size"
            text={formatFileSize(fileSize)}
          />
          <Detail.Metadata.Label
            title="PDF Version"
            text={report.pdf_version}
          />
          <Detail.Metadata.Label
            title="Pages"
            text={String(report.page_count)}
          />
          <Detail.Metadata.Label
            title="Encrypted"
            text={report.encrypted ? "Yes" : "No"}
          />
        </Detail.Metadata>
      }
    />
  );
}

async function runPreflight(pdfPath: string): Promise<PreflightReport> {
  let stdout: string;
  try {
    const result = await execFileAsync(getDelphitoolsCliPath(), [
      "preflight",
      "--json",
      "--quiet",
      pdfPath,
    ]);
    stdout = result.stdout;
  } catch (error) {
    const execError = error as { stdout?: string };
    if (execError.stdout && typeof execError.stdout === "string") {
      stdout = execError.stdout;
    } else {
      throw error;
    }
  }

  const rawJson = stdout.trim();
  if (!rawJson) {
    throw new Error("delphitools returned empty preflight output.");
  }

  try {
    const report = JSON.parse(rawJson) as PreflightReport;
    return report;
  } catch {
    throw new Error("delphitools returned invalid JSON.");
  }
}

function categorizeWarning(
  warning: string,
): "document" | "geometry" | "font" | "image" | "colour" | "other" {
  const w = warning.toLowerCase();
  if (
    w.includes("encrypted") ||
    w.includes("version") ||
    w.includes("security")
  ) {
    return "document";
  }
  if (
    w.includes("bleedbox") ||
    w.includes("trimbox") ||
    w.includes("orientation") ||
    w.includes("page size")
  ) {
    return "geometry";
  }
  if (w.includes("font")) {
    return "font";
  }
  if (w.includes("image") || w.includes("dpi") || w.includes("resolution")) {
    return "image";
  }
  if (
    w.includes("colour") ||
    w.includes("color") ||
    w.includes("cmyk") ||
    w.includes("rgb") ||
    w.includes("gray") ||
    w.includes("spot")
  ) {
    return "colour";
  }
  return "other";
}

function generateMarkdownReport(
  report: PreflightReport,
  pdfPath: string,
  fileSize: number,
): string {
  const filename = path.basename(pdfPath);
  const totalWarnings = report.warnings.length;

  let statusText = "🟢 **Print Ready**";
  let statusDescription =
    "This PDF has no warning issues and is ready for print.";
  if (report.encrypted) {
    statusText = "🔴 **Encrypted / Restricted**";
    statusDescription =
      "The PDF is encrypted or has security restrictions. Commercial printing workflows may fail.";
  } else if (totalWarnings > 0) {
    statusText = `⚠️ **Warnings Found (${totalWarnings})**`;
    statusDescription =
      "Some preflight issues were identified that might affect printing quality.";
  }

  const metadataSection = `
## PDF Metadata
| Property | Value |
| --- | --- |
| **File Name** | ${escapeMarkdown(filename)} |
| **File Size** | ${formatFileSize(fileSize)} |
| **PDF Version** | ${report.pdf_version} |
| **Pages** | ${report.page_count} |
| **Encrypted** | ${report.encrypted ? "Yes" : "No"} |
  `.trim();

  let issuesSection = "## Issues by Category\n\n🟢 No issues detected.";
  if (totalWarnings > 0) {
    const categorized = {
      document: [] as string[],
      geometry: [] as string[],
      font: [] as string[],
      image: [] as string[],
      colour: [] as string[],
      other: [] as string[],
    };

    for (const w of report.warnings) {
      const cat = categorizeWarning(w);
      categorized[cat].push(w);
    }

    const sections: string[] = [];

    if (categorized.document.length > 0) {
      sections.push(
        `### Document Issues\n` +
          categorized.document.map((w) => `- ${escapeMarkdown(w)}`).join("\n"),
      );
    }
    if (categorized.geometry.length > 0) {
      sections.push(
        `### Geometry Issues\n` +
          categorized.geometry.map((w) => `- ${escapeMarkdown(w)}`).join("\n"),
      );
    }
    if (categorized.font.length > 0) {
      sections.push(
        `### Font Issues\n` +
          categorized.font.map((w) => `- ${escapeMarkdown(w)}`).join("\n"),
      );
    }
    if (categorized.image.length > 0) {
      sections.push(
        `### Image Issues\n` +
          categorized.image.map((w) => `- ${escapeMarkdown(w)}`).join("\n"),
      );
    }
    if (categorized.colour.length > 0) {
      sections.push(
        `### Colour Issues\n` +
          categorized.colour.map((w) => `- ${escapeMarkdown(w)}`).join("\n"),
      );
    }
    if (categorized.other.length > 0) {
      sections.push(
        `### Other Issues\n` +
          categorized.other.map((w) => `- ${escapeMarkdown(w)}`).join("\n"),
      );
    }

    issuesSection = `## Issues by Category\n\n` + sections.join("\n\n");
  }

  const pageRows = report.pages
    .map((p) => {
      const mbStr = p.media_box
        ? `${p.media_box.width_mm.toFixed(1)} × ${p.media_box.height_mm.toFixed(1)} mm`
        : "—";
      const trimStr = p.trim_box
        ? `${p.trim_box.width_mm.toFixed(1)} × ${p.trim_box.height_mm.toFixed(1)} mm`
        : "No";
      const bleedStr = p.bleed_box
        ? `${p.bleed_box.width_mm.toFixed(1)} × ${p.bleed_box.height_mm.toFixed(1)} mm`
        : "No";
      const rotStr = p.rotation !== 0 ? `${p.rotation}°` : "0°";

      let imageStr = "0";
      if (p.image_count > 0) {
        if (p.image_dpis && p.image_dpis.length > 0) {
          const min = Math.min(...p.image_dpis);
          const max = Math.max(...p.image_dpis);
          imageStr =
            min === max
              ? `${p.image_count} (~${min} DPI)`
              : `${p.image_count} (${min}-${max} DPI)`;
        } else {
          imageStr = `${p.image_count}`;
        }
      }

      const spotStr =
        p.spot_colour_spaces.length > 0
          ? p.spot_colour_spaces.join(", ")
          : "None";
      const transStr = p.transparency ? "Yes" : "No";

      return `| ${p.page} | ${mbStr} | ${trimStr} | ${bleedStr} | ${rotStr} | ${imageStr} | ${transStr} | ${spotStr} |`;
    })
    .join("\n");

  const pageDetailsSection = `
## Page Details
| Page | MediaBox | TrimBox | BleedBox | Rotate | Images (DPI) | Transp. | Spot Colours |
| --- | --- | --- | --- | --- | --- | --- | --- |
${pageRows}
  `.trim();

  let fontDetailsSection = "## Font Summary\n\n🟢 No fonts detected.";
  if (report.fonts.length > 0) {
    const fontRows = report.fonts
      .map((f) => {
        const embeddedStr = f.embedded ? "✅ Embedded" : "❌ NOT EMBEDDED";
        return `| **${escapeMarkdown(f.name)}** | ${f.subtype || "—"} | ${embeddedStr} |`;
      })
      .join("\n");

    fontDetailsSection = `
## Font Summary
| Font Family | Subtype | Status |
| --- | --- | --- |
${fontRows}
    `.trim();
  }

  return `
# PDF Preflight Report

${statusText}
${statusDescription}

---

${metadataSection}

---

${issuesSection}

---

${pageDetailsSection}

---

${fontDetailsSection}
  `.trim();
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+.!|>-])/g, "\\$1");
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

  return `${size >= 10 ? size.toFixed(1) : size.toFixed(2)} ${units[unitIndex]}`;
}
