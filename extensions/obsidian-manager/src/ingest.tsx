import {
  ActionPanel,
  Action,
  Detail,
  Form,
  List,
  showToast,
  Toast,
  LaunchProps,
  getSelectedFinderItems,
  useNavigation,
  Icon,
  Color,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect } from "react";
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
  isEpubFile,
  extractEpubChapters,
  selectRelevantChapters,
  EpubChapter,
  EpubInfo,
  getConfig,
  ResearchMode,
  modeToString,
  getModeDescription,
  ProcessingResult,
  saveUndoRecord,
} from "./lib/ingest";
import { existsSync } from "fs";

interface Arguments {
  source?: string;
}

interface FormValues {
  source: string;
  deep: boolean;
  expert: boolean;
  concierge: boolean;
  forceReprocess: boolean;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { push } = useNavigation();
  const [initialSource, setInitialSource] = useState<string>("");

  useEffect(() => {
    async function getInitialSource() {
      if (props.arguments.source) {
        setInitialSource(props.arguments.source);
        return;
      }

      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0) {
          setInitialSource(finderItems[0].path);
        }
      } catch {
        // No Finder selection
      }
    }

    getInitialSource();
  }, [props.arguments.source]);

  function handleSubmit(values: FormValues) {
    const mode: ResearchMode = {
      deep: values.deep,
      expert: values.expert,
      concierge: values.concierge,
    };

    // Check if source is an EPUB file
    if (!isUrl(values.source) && isEpubFile(values.source)) {
      push(<EpubChapterSelector filePath={values.source} mode={mode} />);
    } else {
      push(<IngestPreview source={values.source} mode={mode} forceReprocess={values.forceReprocess} />);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Analyze & Preview" onSubmit={handleSubmit} icon={Icon.MagnifyingGlass} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source"
        title="Source"
        placeholder="URL or file path"
        defaultValue={initialSource}
        info="Enter a URL or file path to ingest"
      />

      <Form.Separator />

      <Form.Description title="Research Modes" text="Select one or more modes to combine" />

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
        id="forceReprocess"
        label="Force Reprocess"
        info="Re-ingest even if previously processed with same mode"
        defaultValue={false}
      />
    </Form>
  );
}

interface IngestPreviewProps {
  source: string;
  mode: ResearchMode;
  forceReprocess: boolean;
}

function IngestPreview({ source, mode, forceReprocess }: IngestPreviewProps) {
  const { pop } = useNavigation();
  const [markdown, setMarkdown] = useState<string>("# Analyzing...\n\nExtracting content and analyzing with AI...");
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [sourceInfo, setSourceInfo] = useState<{ path: string; name: string; isUrl: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modeDesc = getModeDescription(mode);
  const config = getConfig();

  useEffect(() => {
    async function analyze() {
      try {
        if (!source) {
          throw new Error("No source provided");
        }

        const isUrlSource = isUrl(source);
        const isYouTube = isYouTubeUrl(source);

        // Check deduplication
        const ingestedSources = await loadIngestedSources();
        const existingIngestion = isSourceIngested(ingestedSources, source, mode);

        if (existingIngestion && !forceReprocess) {
          setMarkdown(
            `# Already Ingested\n\n**Source:** ${source}\n\n**Previous Mode:** ${existingIngestion.mode || "normal"}\n\n**Requested Mode:** ${modeToString(mode)}\n\nThis source was already ingested with the same mode. Enable "Force Reprocess" to re-ingest.`,
          );
          setIsLoading(false);
          return;
        }

        // Validate file exists (if not URL)
        if (!isUrlSource && !existsSync(source)) {
          throw new Error(`File not found: ${source}`);
        }

        setMarkdown(`# Analyzing\n\n**Mode:** ${modeDesc}\n\n**Source:** ${source}\n\nScanning vault...`);

        // Get vault structure
        const vault = await getVaultStructure();
        setMarkdown(
          (prev) =>
            prev + `\n\nFound ${vault.folders.length} folders, ${vault.notes.length} notes.\n\nExtracting content...`,
        );

        // Extract content
        let content: string;
        let sourceName: string;

        if (isYouTube) {
          // YouTube transcription
          setMarkdown((prev) => prev + `\n\n**Transcribing YouTube video...** (this may take a while)`);

          const transcription = await transcribeYouTube(source, (progress) => {
            setMarkdown((prev) => {
              // Update the last line with progress
              const lines = prev.split("\n");
              const lastLine = lines[lines.length - 1];
              if (lastLine.startsWith("→ ")) {
                lines[lines.length - 1] = `→ ${progress}`;
              } else {
                lines.push(`→ ${progress}`);
              }
              return lines.join("\n");
            });
          });

          content = transcription.transcription;
          sourceName = `${transcription.title} (${transcription.channel})`;
          const durationMin = Math.round(transcription.duration / 60);
          setMarkdown(
            (prev) =>
              prev +
              `\n\nTranscribed ${durationMin} min video: "${transcription.title}"\nChannel: ${transcription.channel}\nTranscript: ${content.length} characters`,
          );
        } else if (isUrlSource) {
          const extracted = await extractUrlContent(source);
          content = extracted.content;
          sourceName = extracted.title;
          setMarkdown((prev) => prev + `\n\nExtracted "${sourceName}" (${content.length} characters)`);
        } else {
          content = await extractDocumentContent(source);
          sourceName = source.split("/").pop() || "Document";
          setMarkdown((prev) => prev + `\n\nExtracted ${content.length} characters from "${sourceName}"`);
        }

        // Process with AI
        setMarkdown((prev) => prev + `\n\nAnalyzing with AI (${config.geminiModel})...`);

        const processingResult = await processDocument(content, sourceName, vault, mode);
        setResult(processingResult);
        setSourceInfo({ path: source, name: sourceName, isUrl: isUrlSource });

        // Build preview markdown
        let previewMarkdown = `# Preview: ${sourceName}\n\n**Mode:** ${modeDesc}\n\n`;

        previewMarkdown += `## Summary\n${processingResult.summary}\n\n`;
        previewMarkdown += `## Reasoning\n${processingResult.reasoning}\n\n`;

        if (processingResult.uncertainties?.length) {
          previewMarkdown += `## Uncertainties\n${processingResult.uncertainties.map((u) => `- ${u}`).join("\n")}\n\n`;
        }

        if (processingResult.newNotes?.length) {
          previewMarkdown += `## Will Create ${processingResult.newNotes.length} Note(s)\n`;
          for (const note of processingResult.newNotes) {
            previewMarkdown += `\n### ${note.path}\n\n`;
            previewMarkdown += "```markdown\n" + note.content.slice(0, 500);
            if (note.content.length > 500) previewMarkdown += "\n...(truncated)";
            previewMarkdown += "\n```\n";
          }
          previewMarkdown += "\n";
        }

        if (processingResult.updates?.length) {
          previewMarkdown += `## Will Update ${processingResult.updates.length} Note(s)\n`;
          for (const update of processingResult.updates) {
            previewMarkdown += `\n### ${update.path}\n`;
            if (update.addLinks?.length) {
              previewMarkdown += `- Add links: ${update.addLinks.join(", ")}\n`;
            }
            if (update.addContent) {
              previewMarkdown += "- Add content:\n```markdown\n" + update.addContent.slice(0, 300);
              if (update.addContent.length > 300) previewMarkdown += "\n...(truncated)";
              previewMarkdown += "\n```\n";
            }
          }
        }

        setMarkdown(previewMarkdown);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setMarkdown(`# Error\n\n\`\`\`\n${errorMessage}\n\`\`\``);
      } finally {
        setIsLoading(false);
      }
    }

    analyze();
  }, [source, mode, forceReprocess]);

  async function handleApply() {
    if (!result || !sourceInfo) return;

    const confirmed = await confirmAlert({
      title: "Apply Changes?",
      message: `This will create ${result.newNotes?.length || 0} notes and update ${result.updates?.length || 0} notes.`,
      primaryAction: {
        title: "Apply",
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    setMarkdown((prev) => prev + "\n\n---\n\n**Applying changes...**");

    try {
      const { created, updated, undo } = await applyChanges(result, sourceInfo);

      // Save undo record
      await saveUndoRecord(undo);

      // Save to ingested sources
      await saveIngestedSource({
        id: sourceInfo.path,
        type: sourceInfo.isUrl ? "url" : "file",
        timestamp: new Date().toISOString(),
        title: sourceInfo.name,
        mode: modeToString(mode),
      });

      let finalMarkdown = `# ✅ Ingestion Complete\n\n**Source:** ${sourceInfo.name}\n\n**Mode:** ${modeDesc}\n\n`;

      if (created.length > 0) {
        finalMarkdown += `## Created Notes\n${created.map((p) => `- ${p}`).join("\n")}\n\n`;
      }

      if (updated.length > 0) {
        finalMarkdown += `## Updated Notes\n${updated.map((p) => `- ${p}`).join("\n")}\n\n`;
      }

      finalMarkdown += `## Summary\n${result.summary}\n\n`;
      finalMarkdown += `\n\n*Undo available via "Undo Last Ingestion" command*`;

      setMarkdown(finalMarkdown);
      setResult(null); // Clear result to hide Apply button

      await showToast({
        style: Toast.Style.Success,
        title: "Ingestion Complete",
        message: `Created ${created.length} notes, updated ${updated.length}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMarkdown((prev) => prev + `\n\n**Error:** ${errorMessage}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Apply Failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {result && !error && <Action title="Apply Changes" icon={Icon.CheckCircle} onAction={handleApply} />}
          <Action title="Back to Form" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser
            title="Open Vault in Obsidian"
            url={`obsidian://open?vault=${encodeURIComponent(config.vaultPath.split("/").pop() || "")}`}
          />
        </ActionPanel>
      }
    />
  );
}

// EPUB Chapter Selector Component
interface EpubChapterSelectorProps {
  filePath: string;
  mode: ResearchMode;
}

function EpubChapterSelector({ filePath, mode }: EpubChapterSelectorProps) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [epubInfo, setEpubInfo] = useState<EpubInfo | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEpub() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Loading EPUB...",
          message: filePath.split("/").pop(),
        });

        const info = await extractEpubChapters(filePath);
        setEpubInfo(info);

        if (info.chapters.length === 0) {
          throw new Error("No readable chapters found in EPUB");
        }

        // Use AI to suggest relevant chapters
        await showToast({
          style: Toast.Style.Animated,
          title: "Analyzing chapters...",
          message: `${info.chapters.length} chapters found`,
        });

        const { selectedChapters: suggested, reasoning } = await selectRelevantChapters(
          info.chapters,
          info.title,
          info.author,
        );

        setSelectedChapters(new Set(suggested.map((ch) => ch.id)));
        setAiReasoning(reasoning);

        await showToast({
          style: Toast.Style.Success,
          title: "EPUB Loaded",
          message: `${suggested.length}/${info.chapters.length} chapters selected`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load EPUB",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadEpub();
  }, [filePath]);

  function toggleChapter(chapterId: string) {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  function selectAll() {
    if (epubInfo) {
      setSelectedChapters(new Set(epubInfo.chapters.map((ch) => ch.id)));
    }
  }

  function selectNone() {
    setSelectedChapters(new Set());
  }

  function ingestSelected() {
    if (!epubInfo || selectedChapters.size === 0) return;

    const chaptersToIngest = epubInfo.chapters.filter((ch) => selectedChapters.has(ch.id));
    push(<EpubIngestPreview epubInfo={epubInfo} chapters={chaptersToIngest} filePath={filePath} mode={mode} />);
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading EPUB\n\n\`\`\`\n${error}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.RotateClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter chapters..."
      navigationTitle={epubInfo ? `${epubInfo.title} by ${epubInfo.author}` : "Loading EPUB..."}
    >
      {epubInfo && (
        <>
          <List.Section title="Book Info" subtitle={aiReasoning}>
            <List.Item
              title={epubInfo.title}
              subtitle={`by ${epubInfo.author}`}
              icon={Icon.Book}
              accessories={[{ text: `${selectedChapters.size}/${epubInfo.chapters.length} chapters selected` }]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Ingest ${selectedChapters.size} Chapters`}
                    icon={Icon.Download}
                    onAction={ingestSelected}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    title="Select All"
                    icon={Icon.CheckCircle}
                    onAction={selectAll}
                    shortcut={{ modifiers: ["cmd"], key: "a" }}
                  />
                  <Action
                    title="Select None"
                    icon={Icon.Circle}
                    onAction={selectNone}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Chapters" subtitle={`${epubInfo.chapters.length} total`}>
            {epubInfo.chapters.map((chapter) => {
              const isSelected = selectedChapters.has(chapter.id);

              return (
                <List.Item
                  key={chapter.id}
                  title={chapter.title}
                  subtitle={chapter.preview.slice(0, 80) + "..."}
                  icon={
                    isSelected
                      ? { source: Icon.CheckCircle, tintColor: Color.Green }
                      : { source: Icon.Circle, tintColor: Color.SecondaryText }
                  }
                  accessories={[
                    { text: `${Math.round((chapter.content?.length || 0) / 1000)}k chars` },
                    { icon: isSelected ? Icon.Check : undefined },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => toggleChapter(chapter.id)}
                      />
                      <Action
                        title={`Ingest ${selectedChapters.size} Chapters`}
                        icon={Icon.Download}
                        onAction={ingestSelected}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action
                        title="Select All"
                        icon={Icon.CheckCircle}
                        onAction={selectAll}
                        shortcut={{ modifiers: ["cmd"], key: "a" }}
                      />
                      <Action
                        title="Select None"
                        icon={Icon.Circle}
                        onAction={selectNone}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}

// EPUB Ingest Preview Component
interface EpubIngestPreviewProps {
  epubInfo: EpubInfo;
  chapters: EpubChapter[];
  filePath: string;
  mode: ResearchMode;
  forceReprocess: boolean;
}

function EpubIngestPreview({ epubInfo, chapters, filePath, mode }: Omit<EpubIngestPreviewProps, "forceReprocess">) {
  const { pop } = useNavigation();
  const [markdown, setMarkdown] = useState<string>("# Processing EPUB...\n\nIngesting selected chapters...");
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState<Array<{ chapter: string; result: ProcessingResult }>>([]);
  const [error, setError] = useState<string | null>(null);

  const modeDesc = getModeDescription(mode);
  const config = getConfig();

  useEffect(() => {
    async function processChapters() {
      try {
        const vault = await getVaultStructure();
        const results: Array<{ chapter: string; result: ProcessingResult }> = [];

        setMarkdown(
          `# Processing: ${epubInfo.title}\n\n**Author:** ${epubInfo.author}\n**Mode:** ${modeDesc}\n**Chapters:** ${chapters.length}\n\n---\n`,
        );

        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];
          setMarkdown((prev) => prev + `\n\n### Processing ${i + 1}/${chapters.length}: ${chapter.title}...`);

          const result = await processDocument(
            chapter.content || "",
            `${epubInfo.title} - ${chapter.title}`,
            vault,
            mode,
          );

          results.push({ chapter: chapter.title, result });

          setMarkdown(
            (prev) => prev + ` Done (${result.newNotes?.length || 0} notes, ${result.updates?.length || 0} updates)`,
          );

          // Small delay between chapters
          if (i < chapters.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        setAllResults(results);

        // Build summary
        const totalNew = results.reduce((sum, r) => sum + (r.result.newNotes?.length || 0), 0);
        const totalUpdates = results.reduce((sum, r) => sum + (r.result.updates?.length || 0), 0);

        let summaryMarkdown = `# Preview: ${epubInfo.title}\n\n`;
        summaryMarkdown += `**Author:** ${epubInfo.author}\n`;
        summaryMarkdown += `**Mode:** ${modeDesc}\n`;
        summaryMarkdown += `**Chapters Processed:** ${chapters.length}\n\n`;
        summaryMarkdown += `## Summary\n`;
        summaryMarkdown += `- **${totalNew}** new notes will be created\n`;
        summaryMarkdown += `- **${totalUpdates}** existing notes will be updated\n\n`;

        summaryMarkdown += `## By Chapter\n\n`;
        for (const { chapter, result } of results) {
          summaryMarkdown += `### ${chapter}\n`;
          summaryMarkdown += `${result.summary}\n`;
          if (result.newNotes?.length) {
            summaryMarkdown += `- New: ${result.newNotes.map((n) => n.title).join(", ")}\n`;
          }
          summaryMarkdown += "\n";
        }

        setMarkdown(summaryMarkdown);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setMarkdown(`# Error\n\n\`\`\`\n${errorMessage}\n\`\`\``);
      } finally {
        setIsLoading(false);
      }
    }

    processChapters();
  }, [chapters, epubInfo, mode]);

  async function handleApply() {
    if (allResults.length === 0) return;

    const totalNew = allResults.reduce((sum, r) => sum + (r.result.newNotes?.length || 0), 0);
    const totalUpdates = allResults.reduce((sum, r) => sum + (r.result.updates?.length || 0), 0);

    const confirmed = await confirmAlert({
      title: "Apply Changes?",
      message: `This will create ${totalNew} notes and update ${totalUpdates} notes from ${chapters.length} chapters.`,
      primaryAction: {
        title: "Apply",
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    setMarkdown((prev) => prev + "\n\n---\n\n**Applying changes...**");

    try {
      let totalCreated = 0;
      let totalUpdated = 0;

      for (let i = 0; i < allResults.length; i++) {
        const { chapter, result } = allResults[i];
        const sourceInfo = {
          path: filePath,
          name: `${epubInfo.title} - ${chapter}`,
          isUrl: false,
        };

        const { created, updated, undo } = await applyChanges(result, sourceInfo);
        await saveUndoRecord(undo);

        totalCreated += created.length;
        totalUpdated += updated.length;
      }

      // Save to ingested sources (once for the whole book)
      await saveIngestedSource({
        id: filePath,
        type: "file",
        timestamp: new Date().toISOString(),
        title: `${epubInfo.title} (${chapters.length} chapters)`,
        mode: modeToString(mode),
      });

      let finalMarkdown = `# ✅ EPUB Ingestion Complete\n\n`;
      finalMarkdown += `**Book:** ${epubInfo.title}\n`;
      finalMarkdown += `**Author:** ${epubInfo.author}\n`;
      finalMarkdown += `**Chapters:** ${chapters.length}\n`;
      finalMarkdown += `**Mode:** ${modeDesc}\n\n`;
      finalMarkdown += `## Results\n`;
      finalMarkdown += `- Created **${totalCreated}** notes\n`;
      finalMarkdown += `- Updated **${totalUpdated}** notes\n\n`;
      finalMarkdown += `*Undo available via "Undo Last Ingestion" command*`;

      setMarkdown(finalMarkdown);
      setAllResults([]); // Clear to hide Apply button

      await showToast({
        style: Toast.Style.Success,
        title: "EPUB Ingestion Complete",
        message: `Created ${totalCreated} notes, updated ${totalUpdated}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMarkdown((prev) => prev + `\n\n**Error:** ${errorMessage}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Apply Failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {allResults.length > 0 && !error && (
            <Action title="Apply All Changes" icon={Icon.CheckCircle} onAction={handleApply} />
          )}
          <Action title="Back to Chapters" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser
            title="Open Vault in Obsidian"
            url={`obsidian://open?vault=${encodeURIComponent(config.vaultPath.split("/").pop() || "")}`}
          />
        </ActionPanel>
      }
    />
  );
}
