import { showToast, Toast, getPreferenceValues, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs-extra";
import path from "path";
import { homedir } from "os";
import { Transformer } from "markmap-lib";

import { Preferences, GeneratedMindMap } from "./utils/types";
import { MIND_MAP_PROMPT, KEYWORD_PROMPT, HTML_TEMPLATE } from "./utils/constants";
import { getInstalledModels, generateOllamaResponse } from "./utils/ollama";
import { ModelList } from "./components/ModelList";
import { MindMapDetail } from "./components/MindMapDetail";

function cleanKeyword(keyword: string, defaultKeyword: string = "mindmap"): string {
  const cleaned = keyword
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!cleaned || cleaned.length > 40) {
    return defaultKeyword;
  }

  return cleaned;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [generatedMap, setGeneratedMap] = useState<GeneratedMindMap | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const transformer = new Transformer();

  useEffect(() => {
    getInstalledModels(preferences.ollamaApi)
      .then(setModels)
      .catch(async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch models",
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => setIsLoading(false));
  }, [preferences.ollamaApi]);

  async function generateMindMap(model: string) {
    try {
      setIsLoading(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Reading clipboard content...",
      });

      const clipboardText = await Clipboard.readText();

      if (!clipboardText?.trim()) {
        throw new Error("Clipboard is empty");
      }

      // Generate keyword with Ollama for a context related filename
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating keyword...",
      });

      const keyword = await generateOllamaResponse(preferences.ollamaApi, model, KEYWORD_PROMPT + clipboardText);
      const cleanedKeyword = cleanKeyword(keyword);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const outputDir = preferences.outputDirectory || path.join(homedir(), "Desktop");
      const outputPath = path.join(outputDir, `markmap-${cleanedKeyword}-${timestamp}.html`);

      // Generate markmap compatible markdown content
      await showToast({
        style: Toast.Style.Animated,
        title: "Generating mind map content...",
      });

      const markdown = await generateOllamaResponse(preferences.ollamaApi, model, MIND_MAP_PROMPT + clipboardText);

      // Transform markdown to mind map via markmap
      const { root } = transformer.transform(markdown);

      // Generate HTML with embedded data
      const html = HTML_TEMPLATE.replace("__DATA__", JSON.stringify(root));

      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath));

      // Save HTML file
      await fs.writeFile(outputPath, html);

      // Copy markdown to clipboard
      await Clipboard.copy(markdown);

      setGeneratedMap({
        path: outputPath,
        markdown: markdown,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Mind map generated!",
      });
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to generate mind map",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (generatedMap) {
    return <MindMapDetail {...generatedMap} />;
  }

  return <ModelList models={models} isLoading={isLoading} onSelect={generateMindMap} />;
}
