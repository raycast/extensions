import { Action, ActionPanel, Clipboard, Icon, Keyboard, showHUD, showInFinder, showToast, Toast } from "@raycast/api";
import { downloadToFile, Exportable, ExportFormat, toFormat } from "../utils/exportUtils";
import { failToast } from "../utils/toastUtils";

interface ResourceExportActionsProps {
  /** The resource to export, or undefined while its body is still loading. */
  resource: Exportable | undefined;
  /**
   * Whether Copy as Text takes `Common.Copy`. True where the resource IS the
   * view; false in a list whose rows have their own Copy URL, which needs the
   * shortcut more than the whole file does.
   */
  textCopyShortcut?: boolean;
}

const COPY_SHORTCUTS: Record<ExportFormat, Keyboard.Shortcut | undefined> = {
  text: Keyboard.Shortcut.Common.Copy,
  markdown: { macOS: { modifiers: ["cmd", "shift"], key: "m" }, Windows: { modifiers: ["ctrl", "shift"], key: "m" } },
  csv: undefined,
};

const DOWNLOAD_SHORTCUTS: Record<ExportFormat, Keyboard.Shortcut | undefined> = {
  text: Keyboard.Shortcut.Common.Save,
  markdown: undefined,
  csv: undefined,
};

const LABEL: Record<ExportFormat, string> = { text: "Text", markdown: "Markdown", csv: "CSV" };

/**
 * The Copy-as / Download-as group, shared by every view that shows a fetched
 * resource: the well-known files, robots.txt, and sitemap.xml.
 *
 * CSV appears only when the resource actually has rows. Offering it for
 * free-form text produces a one-column file that is strictly worse than the
 * text, and a disabled-looking action the user has to learn to ignore is worse
 * than an absent one.
 */
export function ResourceExportActions({ resource, textCopyShortcut = true }: ResourceExportActionsProps) {
  if (!resource) return null;

  const formats: ExportFormat[] = resource.rows ? ["text", "markdown", "csv"] : ["text", "markdown"];

  const download = async (format: ExportFormat) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Saving ${LABEL[format]}…` });
    try {
      const path = await downloadToFile(resource, format);
      toast.style = Toast.Style.Success;
      toast.title = `Saved ${path.split("/").pop()}`;
      toast.message = "in Downloads";
      // `showInFinder` reveals and selects the file. Opening its directory — the
      // obvious-looking alternative — leaves the user hunting for it.
      toast.primaryAction = {
        // A toast action cannot use <Action.ShowInFinder>, which would supply the
        // per-platform title for free, so this one is hand-written — and this
        // extension declares Windows, where "Show in Finder" is wrong. Wording
        // verified against the installed types (@raycast/api v2.1.3).
        title: process.platform === "darwin" ? "Show in Finder" : "File Explorer",
        shortcut: { macOS: { modifiers: ["cmd"], key: "o" }, Windows: { modifiers: ["ctrl"], key: "o" } },
        onAction: () => showInFinder(path),
      };
      toast.secondaryAction = {
        title: "Copy Path",
        shortcut: { macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } },
        onAction: async (t) => {
          await Clipboard.copy(path);
          t.message = "Path copied to clipboard";
        },
      };
    } catch (error) {
      // A failure the user cannot copy is one they cannot report.
      failToast(toast, `Could not save ${LABEL[format]}`, error);
    }
  };

  // Built when chosen, not at render. A list renders this panel once per row,
  // so `content={toFormat(…)}` would build the Markdown table and the CSV of a
  // 50,000-row sitemap two thousand times before anything was selected.
  const copy = async (format: ExportFormat) => {
    try {
      await Clipboard.copy(toFormat(resource, format));
      await showHUD("Copied to Clipboard");
    } catch (error) {
      failToast(await showToast({ style: Toast.Style.Failure, title: "" }), `Could not copy ${LABEL[format]}`, error);
    }
  };

  return (
    <>
      <ActionPanel.Section title="Copy Resource">
        {formats.map((format) => (
          <Action
            key={`copy-${format}`}
            title={`Copy as ${LABEL[format]}`}
            icon={Icon.Clipboard}
            shortcut={format === "text" && !textCopyShortcut ? undefined : COPY_SHORTCUTS[format]}
            onAction={() => copy(format)}
          />
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section title="Download Resource">
        {formats.map((format) => (
          <Action
            key={`download-${format}`}
            title={`Download as ${LABEL[format]}`}
            icon={Icon.Download}
            shortcut={DOWNLOAD_SHORTCUTS[format]}
            onAction={() => download(format)}
          />
        ))}
      </ActionPanel.Section>
    </>
  );
}
