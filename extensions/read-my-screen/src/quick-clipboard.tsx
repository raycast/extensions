import { Action, ActionPanel, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { analyzeImage, formatVisionError } from "./analyze-image";
import { ClipboardImageError, readImageFromClipboard } from "./clipboard-image";
import { parseModelPreference, resolvedModelPreference } from "./model";
import { formatUsageHint } from "./token-usage";
import { assistantDetailMarkdown } from "./ui/markdown";

export default function QuickClipboardCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [markdown, setMarkdown] = useState("");
  const [plainText, setPlainText] = useState("");
  const [usageHint, setUsageHint] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const showTok = prefs.showTokenUsage === true;
      const defaultPrompt =
        prefs.defaultPrompt?.trim() ||
        "Describe what you see on the screen. Call out any text, UI elements, errors, or notable details.";
      const modelPref = resolvedModelPreference(prefs.model);
      const usageOpts = {
        modelValue: modelPref,
        showEstimatedCost: showTok && prefs.showEstimatedCost === true,
      };
      const parsed = parseModelPreference(modelPref);

      try {
        const img = await readImageFromClipboard();
        const { text, usage } = await analyzeImage(prefs, parsed, img.base64, defaultPrompt, img.mediaType);
        if (cancelled) {
          return;
        }
        setPlainText(text);
        setMarkdown(assistantDetailMarkdown(text));
        setUsageHint(formatUsageHint(usage, showTok, usageOpts).trim());
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ClipboardImageError) {
          setMarkdown(`## Clipboard\n\n${err.message}`);
        } else {
          setMarkdown(`## Analysis failed\n\n${formatVisionError(err)}`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prefs]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={isLoading ? "Reading clipboard and analyzing…" : markdown}
      navigationTitle={isLoading ? "Analyzing…" : "Clipboard Image"}
      metadata={
        usageHint ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Usage" text={usageHint} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        plainText ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Response" content={plainText} icon={Icon.Clipboard} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
