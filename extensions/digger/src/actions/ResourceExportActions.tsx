import { Action, ActionPanel, Clipboard, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { downloadToFile, Exportable, ExportFormat, toFormat } from "../utils/exportUtils";

interface ResourceExportActionsProps {
  /** The resource to export, or undefined while its body is still loading. */
  resource: Exportable | undefined;
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
export function ResourceExportActions({ resource }: ResourceExportActionsProps) {
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
        shortcut: { modifiers: ["cmd"], key: "o" },
        onAction: () => showInFinder(path),
      };
      toast.secondaryAction = {
        title: "Copy Path",
        shortcut: { modifiers: ["cmd"], key: "c" },
        onAction: async (t) => {
          await Clipboard.copy(path);
          t.message = "Path copied to clipboard";
        },
      };
    } catch (error) {
      // Not `toast.style = Failure`: showFailureToast attaches the Copy Error
      // action, and a failure the user cannot copy is one they cannot report.
      await toast.hide();
      await showFailureToast(error, { title: `Could not save ${LABEL[format]}` });
    }
  };

  return (
    <>
      <ActionPanel.Section title="Copy Resource">
        {formats.map((format) => (
          <Action.CopyToClipboard
            key={`copy-${format}`}
            title={`Copy as ${LABEL[format]}`}
            icon={Icon.Clipboard}
            content={toFormat(resource, format)}
            shortcut={COPY_SHORTCUTS[format]}
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
