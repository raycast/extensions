import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import {
  getVaultStructure,
  extractUrlContent,
  processDocument,
  applyChanges,
  loadIngestedSources,
  saveIngestedSource,
  isSourceIngested,
  isUrl,
  isYouTubeUrl,
  transcribeYouTube,
  modeToString,
  saveUndoRecord,
} from "./lib/ingest";

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    const source = clipboardText.trim();

    // Check if it's a URL
    if (!isUrl(source)) {
      await showHUD("❌ Clipboard doesn't contain a URL");
      return;
    }

    const isYouTube = isYouTubeUrl(source);

    await showToast({
      style: Toast.Style.Animated,
      title: isYouTube ? "Transcribing YouTube..." : "Ingesting URL...",
      message: source,
    });

    // Check deduplication (normal mode, no flags)
    const mode = {};
    const ingestedSources = await loadIngestedSources();
    if (isSourceIngested(ingestedSources, source, mode)) {
      await showHUD("⚠️ Already ingested");
      return;
    }

    // Get vault structure
    const vault = await getVaultStructure();

    // Extract content
    let content: string;
    let title: string;

    if (isYouTube) {
      const transcription = await transcribeYouTube(source, (progress) => {
        showToast({
          style: Toast.Style.Animated,
          title: "Transcribing...",
          message: progress,
        });
      });
      content = transcription.transcription;
      title = `${transcription.title} (${transcription.channel})`;
    } else {
      const extracted = await extractUrlContent(source);
      content = extracted.content;
      title = extracted.title;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Analyzing with AI...",
      message: title,
    });

    // Process with AI
    const result = await processDocument(content, title, vault, mode);

    // Apply changes
    const { created, updated, undo } = await applyChanges(result, {
      path: source,
      name: title,
      isUrl: true,
    });

    // Save undo record
    await saveUndoRecord(undo);

    // Save to ingested sources
    await saveIngestedSource({
      id: source,
      type: "url",
      timestamp: new Date().toISOString(),
      title: title,
      mode: modeToString(mode),
    });

    await showHUD(`✅ Created ${created.length}, updated ${updated.length} notes`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Ingestion Failed",
      message: errorMessage,
    });
    await showHUD(`❌ ${errorMessage.slice(0, 50)}`);
  }
}
