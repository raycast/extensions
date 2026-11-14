import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createProvider } from "../services/ai-provider";
import { convertToSte } from "../services/ste-transformer";
import {
  CONTENT_TYPE_LABELS,
  ConversionError,
  MODE_LABELS,
  type ConversionRequest,
  type ConversionResult as Result,
  type ReviewWarning,
} from "../types";
import { fenceBlock } from "../utils/text";

const SEVERITY_ICON: Record<ReviewWarning["severity"], string> = { error: "🔴", warning: "🟠", info: "🔵" };

const PRIVACY_NOTE =
  "Your text is sent to the configured AI provider and is subject to that provider's data policy. This extension does not store or log it. An AI rewrite alone does not certify ASD-STE100 compliance.";

async function runConversion(request: ConversionRequest): Promise<Result> {
  const prefs = getPreferenceValues<Preferences>();
  return convertToSte(
    { ...request, customInstructions: request.customInstructions ?? prefs.customInstructions },
    createProvider(prefs),
  );
}

function warningsMarkdown(warnings: ReviewWarning[]): string {
  if (warnings.length === 0) return "";
  const lines = warnings.map((w) => `- ${SEVERITY_ICON[w.severity]} ${w.message}`);
  return `### Review warnings\n${lines.join("\n")}\n\n`;
}

function resultMarkdown(result: Result): string {
  const banner = result.needsReview
    ? "> **Human review required.** Check the warnings before you use this text.\n\n"
    : "";
  return [
    `${banner}${warningsMarkdown(result.warnings)}### Rewritten (STE)\n\n${fenceBlock(result.rewritten)}`,
    `### Original\n\n${fenceBlock(result.original)}`,
    `_${PRIVACY_NOTE}_`,
  ].join("\n\n");
}

export function ConversionResultView({ request: initialRequest }: { request: ConversionRequest }) {
  const [request, setRequest] = useState(initialRequest);
  const { data, error, isLoading, revalidate } = usePromise(runConversion, [request], {
    // Failures are shown in the view; no toast, so no message text leaves this screen.
    onError: () => {},
  });

  const retryMinimal = () => setRequest({ ...request, mode: "minimal" });

  if (error) {
    const kind = error instanceof ConversionError ? error.kind : "failed";
    const needsPrefs = kind === "unavailable" || kind === "auth";
    return (
      <Detail
        markdown={`# Conversion failed\n\n${error.message}\n\nThe original text was **not** converted and was not changed.`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            {needsPrefs && (
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            )}
            <Action.CopyToClipboard title="Copy Original Text" content={request.text} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={data ? resultMarkdown(data) : "Converting…"}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Content Type" text={CONTENT_TYPE_LABELS[data.contentType]} />
            <Detail.Metadata.Label title="Mode" text={MODE_LABELS[data.mode]} />
            {data.repaired && (
              <Detail.Metadata.Label title="Correction Pass" text="Applied (fixed STE check findings)" />
            )}
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={data.needsReview ? "Needs review" : "No warnings flagged"}
                color={data.needsReview ? "#E5484D" : "#30A46C"}
              />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        )
      }
      actions={
        data && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={data.rewritten} />
            <Action.Paste
              title="Paste Result to Frontmost App"
              content={data.rewritten}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            {data.mode !== "minimal" && (
              <Action title="Retry with Minimal Changes" icon={Icon.Eraser} onAction={retryMinimal} />
            )}
            <Action.CopyToClipboard title="Copy Original Text" content={data.original} />
          </ActionPanel>
        )
      }
    />
  );
}
