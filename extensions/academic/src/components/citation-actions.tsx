import {
  Action,
  ActionPanel,
  Icon,
  Toast,
  environment,
  getApplications,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  formatBibTeX,
  formatCitation,
  formatCslJson,
  formatLatexCite,
  formatMarkdownReference,
  formatPandocCite,
  formatRis,
} from "../lib/citations";
import type { WorkResult } from "../types";

export function CitationActions({ work }: { work: WorkResult }) {
  const ris = formatRis(work);
  return (
    <>
      <ActionPanel.Section title="Formatted References">
        <Action.CopyToClipboard
          title="Copy ABNT Reference"
          content={formatCitation(work, "abnt")}
        />
        <Action.CopyToClipboard
          title="Copy APA Reference"
          content={formatCitation(work, "apa")}
        />
        <Action.CopyToClipboard
          title="Copy Chicago Reference"
          content={formatCitation(work, "chicago")}
        />
        <Action.CopyToClipboard
          title="Copy MLA Reference"
          content={formatCitation(work, "mla")}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Reference Managers">
        <Action.CopyToClipboard
          title="Copy BibTeX"
          content={formatBibTeX(work)}
        />
        <Action.CopyToClipboard title="Copy RIS" content={ris} />
        <Action.CopyToClipboard
          title="Copy CSL JSON"
          content={formatCslJson(work)}
        />
        <Action.CopyToClipboard
          title="Copy Markdown Reference"
          content={formatMarkdownReference(work)}
        />
        <Action.CopyToClipboard
          title="Copy LaTeX Cite Command"
          content={formatLatexCite(work)}
        />
        <Action.CopyToClipboard
          title="Copy Pandoc Citation"
          content={formatPandocCite(work)}
        />
        <Action
          title="Import RIS into Zotero"
          icon={Icon.Document}
          onAction={() => exportRisToZotero(work, ris)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Explore Scholarly Relations">
        <Action.OpenInBrowser
          title="Related Works on OpenAlex"
          icon={Icon.Link}
          url={`https://openalex.org/works?${new URLSearchParams({ search: work.identifiers.doi ?? work.title })}`}
        />
        <Action.OpenInBrowser
          title="Citations and References on Semantic Scholar"
          icon={Icon.Link}
          url={`https://www.semanticscholar.org/search?${new URLSearchParams({ q: work.identifiers.doi ?? work.title })}`}
        />
        <Action.OpenInBrowser
          title="Search Citations on Google Scholar"
          icon={Icon.Link}
          url={`https://scholar.google.com/scholar?${new URLSearchParams({ q: `"${work.title}"` })}`}
        />
      </ActionPanel.Section>
    </>
  );
}

async function exportRisToZotero(work: WorkResult, ris: string): Promise<void> {
  try {
    const exportDirectory = join(environment.supportPath, "exports");
    await mkdir(exportDirectory, { recursive: true });
    const filePath = join(exportDirectory, `${safeFilename(work.title)}.ris`);
    await writeFile(filePath, `${ris}\n`, "utf8");

    const applications = await getApplications();
    const zotero = applications.find(
      (application) =>
        application.bundleId === "org.zotero.zotero" ||
        application.name === "Zotero",
    );
    if (zotero) {
      await open(filePath, zotero);
      await showToast({
        style: Toast.Style.Success,
        title: "RIS sent to Zotero",
      });
    } else {
      await showInFinder(filePath);
      await showToast({
        style: Toast.Style.Success,
        title: "RIS file created",
        message: "Zotero was not found; import the selected file manually.",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not export the reference",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function safeFilename(title: string): string {
  const value = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return (value || "reference").slice(0, 80);
}
