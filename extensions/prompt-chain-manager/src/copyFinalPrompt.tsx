import React, { useState, useEffect } from "react";
import {
  showToast,
  Toast,
  LocalStorage,
  getPreferenceValues,
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
} from "@raycast/api";
import { PromptChunk } from "./types"; // Adjust path if needed

const STORAGE_KEY = "promptChainChunks_v1"; // Must match the key used elsewhere

// Define preferences structure matching package.json
interface Preferences {
  includeHeadersInCopy: boolean;
}

// Interface for TOC items
interface TocItem {
  id: string; // Use chunk id for key
  title: string; // Header or chunk identifier
}

// --- Helper Functions ---

async function loadChainFromStorage(): Promise<PromptChunk[]> {
  // ... (same as before)
  console.log("[PerChunkTruncHelper] Loading chain from storage...");
  try {
    const storedChainJson = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (storedChainJson) {
      const parsed = JSON.parse(storedChainJson);
      const result = Array.isArray(parsed) ? parsed : [];
      console.log(`[PerChunkTruncHelper] Loaded ${result.length} chunks.`);
      return result;
    }
  } catch (error) {
    console.error("[PerChunkTruncHelper] Failed to load or parse prompt chain:", error);
  }
  console.log("[PerChunkTruncHelper] No stored chain found or error occurred, returning empty array.");
  return [];
}

/**
 * Generates the plain text string from enabled chunks based on preference,
 * suitable for copying to the clipboard. (UNCHANGED)
 */
function formatEnabledChunks(chain: PromptChunk[], includeHeaders: boolean): string {
  const enabledChunks = chain.filter((chunk) => chunk.enabled);
  console.log(`[formatEnabledChunks] Formatting ${enabledChunks.length} enabled chunks.`);
  return enabledChunks
    .map((chunk) => {
      if (includeHeaders && chunk.header) {
        return `--- [${chunk.header}] ---\n\n${chunk.content}`;
      } else {
        return chunk.content;
      }
    })
    .join("\n\n");
}

/**
 * Truncates text in the middle, keeping start and end portions. (UNCHANGED)
 */
function truncateMiddle(text: string, maxLength: number, keepRatio = 0.4): string {
  if (text.length <= maxLength) {
    return text;
  }
  const keepLength = Math.floor((maxLength * keepRatio) / 2) * 2;
  const keepStart = keepLength / 2;
  const keepEnd = keepLength / 2;
  const ellipsis = "\n\n... (Truncated Middle) ...\n\n";
  if (keepStart + keepEnd >= text.length) {
    const approxKeepStart = Math.min(text.length, maxLength - ellipsis.length);
    if (approxKeepStart < 0) return ellipsis;
    return text.substring(0, approxKeepStart) + ellipsis;
  }
  return text.substring(0, keepStart) + ellipsis + text.substring(text.length - keepEnd);
}

// --- Main Component ---

export default function CopyFinalPromptWithPerChunkTruncation() {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [finalPromptText, setFinalPromptText] = useState<string>(""); // Holds FULL text for copying
  const [previewMarkdown, setPreviewMarkdown] = useState<string>(""); // Holds formatted PREVIEW
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // --- NEW: State for derived counts needed for metadata/actions ---
  const [enabledChunkCount, setEnabledChunkCount] = useState<number>(0);
  const [truncatedChunkCount, setTruncatedChunkCount] = useState<number>(0);
  // --- NEW: Store all loaded chunks to find content for copy action ---
  const [allLoadedChunks, setAllLoadedChunks] = useState<PromptChunk[]>([]);

  // Define max length PER CHUNK for preview truncation
  const maxPreviewLengthPerChunk = 500; // Adjust as needed

  useEffect(() => {
    async function generateData() {
      console.log("PerChunkTrunc Command: generateData started.");
      setIsLoading(true);
      setError(null);
      setPreviewMarkdown(""); // Clear previous preview
      try {
        const preferences = getPreferenceValues<Preferences>();
        const currentChain = await loadChainFromStorage();
        setAllLoadedChunks(currentChain); // <-- Store all loaded chunks
        console.log(`PerChunkTrunc Command: Loaded ${currentChain.length} total chunks.`);

        const enabledChunks = currentChain.filter((chunk) => chunk.enabled);
        setEnabledChunkCount(enabledChunks.length); // <-- Store enabled count
        console.log(`PerChunkTrunc Command: Found ${enabledChunks.length} enabled chunks.`);

        if (enabledChunks.length === 0) {
          console.log("PerChunkTrunc Command: No enabled chunks found. Setting empty state.");
          setFinalPromptText("");
          setTocItems([]);
          setPreviewMarkdown("*No enabled chunks to display.*");
          setTruncatedChunkCount(0); // Reset count
        } else {
          // --- Generate FULL text for Copy Action ---
          console.log("PerChunkTrunc Command: Formatting final prompt text (for copy action)...");
          const formattedFullText = formatEnabledChunks(enabledChunks, preferences.includeHeadersInCopy);
          console.log("PerChunkTrunc Command: Generated finalPromptText length:", formattedFullText.length);
          setFinalPromptText(formattedFullText);

          // --- Generate TOC ---
          console.log("PerChunkTrunc Command: Generating TOC items...");
          const toc = enabledChunks.map((chunk, index) => ({
            id: chunk.id,
            title: chunk.header || `Chunk #${index + 1}`,
          }));
          setTocItems(toc);
          console.log(`PerChunkTrunc Command: Generated ${toc.length} TOC items.`);

          // --- Generate PREVIEW text & Calculate Truncated Count ---
          console.log("PerChunkTrunc Command: Formatting preview markdown with per-chunk truncation...");
          let potentiallyTruncatedCount = 0;
          const previewContent = enabledChunks
            .map((chunk) => {
              const isLong = chunk.content.length > maxPreviewLengthPerChunk;
              if (isLong) {
                potentiallyTruncatedCount++;
              }
              const truncatedChunkContent = truncateMiddle(chunk.content, maxPreviewLengthPerChunk);
              if (preferences.includeHeadersInCopy && chunk.header) {
                return `--- [${chunk.header}] ---\n\n${truncatedChunkContent}`;
              } else {
                return truncatedChunkContent;
              }
            })
            .join("\n\n");

          setTruncatedChunkCount(potentiallyTruncatedCount); // <-- Store truncated count
          const finalPreviewMarkdown = `\`\`\`\n${previewContent}\n\`\`\``;
          console.log("PerChunkTrunc Command: Generated previewMarkdown length:", previewContent.length);
          setPreviewMarkdown(finalPreviewMarkdown);
          // --- End Preview Generation ---
        }
        // eslint-disable-next-line
      } catch (err: any) {
        console.error("PerChunkTrunc Command: Error caught:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred.");
        setPreviewMarkdown("*Error loading data.*");
      } finally {
        setIsLoading(false);
        console.log("PerChunkTrunc Command: generateData finished.");
      }
    }

    generateData();
  }, []); // Run once on mount

  // --- Create Metadata for the Detail View ---
  // Now uses state variables that are set within useEffect
  const detailMetadata = React.useMemo(() => {
    // Only show metadata if not loading and no errors and content exists
    if (isLoading || error || !finalPromptText) return null;
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Total Length (Full)" text={`${finalPromptText.length} characters`} />
        <List.Item.Detail.Metadata.Label title="Enabled Chunks" text={`${enabledChunkCount}`} />
        {/* Use truncatedCount state here */}
        {truncatedChunkCount > 0 && (
          <List.Item.Detail.Metadata.Label
            title="Preview Note"
            text={`${truncatedChunkCount} chunk(s) truncated in preview.`}
          />
        )}
      </List.Item.Detail.Metadata>
    );
    // Depend on the state variables calculated in useEffect
  }, [isLoading, error, finalPromptText, enabledChunkCount, truncatedChunkCount]);

  // --- Render UI ---
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search chunks by header..."
      isShowingDetail={true} // Keep detail pane enabled
    >
      {/* Error View */}
      {error && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Error Loading Data"
          description={error}
        />
      ) : /* Empty View */
      tocItems.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Enabled Chunks Found"
          description="Enable some chunks in 'Manage Prompt Chain' first."
        />
      ) : (
        // Section showing enabled chunks (acting as TOC)
        <List.Section title="Enabled Chunks (TOC)" subtitle={`${tocItems.length} items`}>
          {tocItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              icon={Icon.List} // Use a consistent icon
              // Detail shows the SAME single preview, built from per-chunk truncated content
              detail={
                <List.Item.Detail
                  markdown={previewMarkdown} // Use the state variable holding the formatted preview markdown
                  metadata={detailMetadata} // Use the memoized metadata
                />
              }
              // Actions
              actions={
                <ActionPanel>
                  {/* Primary action copies the FULL combined prompt */}
                  <Action.CopyToClipboard
                    title="Copy Full Prompt"
                    content={finalPromptText} // Copy the FULL, UNTRUNCATED text from state
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onCopy={() =>
                      showToast(
                        Toast.Style.Success,
                        "Copied Full Prompt",
                        `${finalPromptText.length} characters copied.`,
                      )
                    }
                  />
                  {/* Action to copy just the header */}
                  <Action.CopyToClipboard title="Copy This Header" content={item.title} />
                  {/* Action to copy individual chunk's FULL content */}
                  <Action.CopyToClipboard
                    title="Copy This Chunk's Full Content"
                    // Find the original chunk content based on item.id from ALL loaded chunks
                    content={allLoadedChunks.find((c) => c.id === item.id)?.content ?? ""} // Use allLoadedChunks state
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
