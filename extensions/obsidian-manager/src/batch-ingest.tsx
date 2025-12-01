import { ActionPanel, Action, Form, Detail, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import {
  getVaultStructure,
  extractUrlContent,
  extractDocumentContent,
  processDocument,
  applyChanges,
  loadIngestedSources,
  saveIngestedSource,
  isSourceIngested,
  isUrl,
  isYouTubeUrl,
  transcribeYouTube,
  getConfig,
  ResearchMode,
  modeToString,
  getModeDescription,
  saveUndoRecord,
} from "./lib/ingest";
import { existsSync } from "fs";

interface FormValues {
  sources: string;
  deep: boolean;
  expert: boolean;
  concierge: boolean;
  skipDuplicates: boolean;
}

export default function Command() {
  const { push } = useNavigation();

  function handleSubmit(values: FormValues) {
    const sources = values.sources
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sources.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No sources provided",
        message: "Enter at least one URL or file path",
      });
      return;
    }

    const mode: ResearchMode = {
      deep: values.deep,
      expert: values.expert,
      concierge: values.concierge,
    };

    push(<BatchProcessor sources={sources} mode={mode} skipDuplicates={values.skipDuplicates} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Batch Ingestion" onSubmit={handleSubmit} icon={Icon.Play} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sources"
        title="Sources"
        placeholder="Enter URLs or file paths, one per line"
        info="Each line should be a URL or file path to ingest"
      />

      <Form.Separator />

      <Form.Description title="Research Modes" text="Applied to all sources" />

      <Form.Checkbox
        id="deep"
        label="Deep Dive"
        info="Extract obscure details, methodological nuances, edge cases"
        defaultValue={false}
      />

      <Form.Checkbox
        id="expert"
        label="Expert Accuracy"
        info="Distinguish facts vs theories vs speculation, flag uncertainties"
        defaultValue={false}
      />

      <Form.Checkbox
        id="concierge"
        label="Research Concierge"
        info="Add 'If you want to go deeper...' section with research pathways"
        defaultValue={false}
      />

      <Form.Separator />

      <Form.Checkbox
        id="skipDuplicates"
        label="Skip Already Ingested"
        info="Skip sources that have already been ingested with the same mode"
        defaultValue={true}
      />
    </Form>
  );
}

interface BatchProcessorProps {
  sources: string[];
  mode: ResearchMode;
  skipDuplicates: boolean;
}

interface SourceResult {
  source: string;
  status: "pending" | "processing" | "success" | "skipped" | "error";
  message?: string;
  created?: number;
  updated?: number;
}

function BatchProcessor({ sources, mode, skipDuplicates }: BatchProcessorProps) {
  const [results, setResults] = useState<SourceResult[]>(sources.map((s) => ({ source: s, status: "pending" })));
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const config = getConfig();
  const modeDesc = getModeDescription(mode);

  async function startProcessing() {
    setIsProcessing(true);

    const ingestedSources = await loadIngestedSources();
    const vault = await getVaultStructure();

    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      setCurrentIndex(i);

      // Update status to processing
      setResults((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: "processing" };
        return updated;
      });

      try {
        const isYouTube = isYouTubeUrl(source);

        // Check deduplication
        const existingIngestion = isSourceIngested(ingestedSources, source, mode);
        if (existingIngestion && skipDuplicates) {
          setResults((prev) => {
            const updated = [...prev];
            updated[i] = { source, status: "skipped", message: "Already ingested" };
            return updated;
          });
          continue;
        }

        const isUrlSource = isUrl(source);

        // Validate file exists
        if (!isUrlSource && !existsSync(source)) {
          setResults((prev) => {
            const updated = [...prev];
            updated[i] = { source, status: "error", message: "File not found" };
            return updated;
          });
          continue;
        }

        // Extract content
        let content: string;
        let sourceName: string;

        if (isYouTube) {
          // YouTube transcription
          const transcription = await transcribeYouTube(source);
          content = transcription.transcription;
          sourceName = `${transcription.title} (${transcription.channel})`;
        } else if (isUrlSource) {
          const extracted = await extractUrlContent(source);
          content = extracted.content;
          sourceName = extracted.title;
        } else {
          content = await extractDocumentContent(source);
          sourceName = source.split("/").pop() || "Document";
        }

        // Process with AI
        const processingResult = await processDocument(content, sourceName, vault, mode);

        // Apply changes
        const { created, updated, undo } = await applyChanges(processingResult, {
          path: source,
          name: sourceName,
          isUrl: isUrlSource,
        });

        // Save undo record
        await saveUndoRecord(undo);

        // Save to ingested sources
        await saveIngestedSource({
          id: source,
          type: isUrlSource ? "url" : "file",
          timestamp: new Date().toISOString(),
          title: sourceName,
          mode: modeToString(mode),
        });

        setResults((prev) => {
          const updated_results = [...prev];
          updated_results[i] = {
            source,
            status: "success",
            message: sourceName,
            created: created.length,
            updated: updated.length,
          };
          return updated_results;
        });
      } catch (err) {
        setResults((prev) => {
          const updated = [...prev];
          updated[i] = {
            source,
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          };
          return updated;
        });
      }

      // Small delay between sources to avoid rate limiting
      if (i < sources.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setIsProcessing(false);
    setCurrentIndex(-1);

    const successCount = results.filter((r) => r.status === "success").length;
    await showToast({
      style: Toast.Style.Success,
      title: "Batch Complete",
      message: `Processed ${successCount} of ${sources.length} sources`,
    });
  }

  // Build markdown summary
  let markdown = `# Batch Ingestion\n\n**Mode:** ${modeDesc}\n\n**Sources:** ${sources.length}\n\n---\n\n`;

  for (const result of results) {
    const icon =
      result.status === "success"
        ? "✅"
        : result.status === "error"
          ? "❌"
          : result.status === "skipped"
            ? "⏭️"
            : result.status === "processing"
              ? "⏳"
              : "⬜";
    const sourceName = result.source.split("/").pop() || result.source;

    markdown += `${icon} **${sourceName}**`;
    if (result.message) {
      markdown += ` - ${result.message}`;
    }
    if (result.created !== undefined || result.updated !== undefined) {
      markdown += ` (${result.created} created, ${result.updated} updated)`;
    }
    markdown += "\n\n";
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;

  if (!isProcessing && currentIndex === -1 && results.some((r) => r.status !== "pending")) {
    markdown += `---\n\n**Summary:** ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isProcessing}
      actions={
        <ActionPanel>
          {!isProcessing && results.every((r) => r.status === "pending") && (
            <Action title="Start Processing" icon={Icon.Play} onAction={startProcessing} />
          )}
          <Action.OpenInBrowser
            title="Open Vault in Obsidian"
            url={`obsidian://open?vault=${encodeURIComponent(config.vaultPath.split("/").pop() || "")}`}
          />
        </ActionPanel>
      }
    />
  );
}
