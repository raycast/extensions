import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  Keyboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useRef, useState } from "react";
import { usePromise } from "@raycast/utils";
import { TONE_DETAILS, formatModelName } from "./config";
import { rewrite } from "./bedrock";
import { rewriteError } from "./errors";
import { type Source } from "./source";

import { literalMarkdown } from "./preview";

export function ResultView({
  source,
  tone,
  instruction,
  nested = false,
}: {
  source: Source;
  tone: string;
  instruction?: string;
  nested?: boolean;
}) {
  // usePromise clears data on failure. Preserve the last successful text in
  // memory so a canceled or failed retry does not discard the user’s work.
  const [lastResult, setLastResult] = useState("");
  const [partial, setPartial] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [preferences, setPreferences] = useState(() =>
    getPreferenceValues<Preferences>(),
  );
  const abortable = useRef<AbortController | undefined>(undefined);
  const { data, error, isLoading, revalidate } = usePromise(
    async (
      text: string,
      tone: string,
      customInstruction: string | undefined,
    ) => {
      const currentPreferences = getPreferenceValues<Preferences>();
      setPreferences(currentPreferences);
      const signal = abortable.current?.signal;
      return rewrite({
        text,
        tone,
        customInstruction,
        preferences: currentPreferences,
        signal,
        onPartial: (value) => {
          if (!signal?.aborted) setPartial(value);
        },
      });
    },
    [source.text, tone, instruction],
    {
      abortable,
      onWillExecute: () => setPartial(""),
      onData: setLastResult,
      // Render sanitized, actionable errors inline. The default failure toast
      // logs provider diagnostics that can include credential helper output.
      onError: () => {},
    },
  );
  const result = data ?? lastResult;
  const message = !isLoading && error ? rewriteError(error) : undefined;

  const title = instruction
    ? "Custom Rewrite"
    : `${TONE_DETAILS[tone]?.title || "Neutral"} Rewrite`;
  const visible = showOriginal ? source.text : isLoading ? partial : result;
  const markdown = [
    showOriginal ? "# Original" : `# ${title}`,
    message
      ? `> ${message}`
      : isLoading
        ? "Rewriting with Amazon Bedrock…"
        : "",
    result && message && !showOriginal ? "Previous completed rewrite:" : "",
    visible ? literalMarkdown(visible) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <Detail
      navigationTitle={nested ? title : undefined}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Tone"
            text={
              instruction
                ? "Custom instruction"
                : TONE_DETAILS[tone]?.title || "Neutral"
            }
          />
          {instruction ? (
            <Detail.Metadata.Label title="Instruction" text={instruction} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Model"
            text={formatModelName(preferences)}
          />
          <Detail.Metadata.Label title="Region" text={preferences.awsRegion} />
          {result && !isLoading ? (
            <Detail.Metadata.Label
              title="Characters"
              text={`${source.text.length.toLocaleString()} → ${result.length.toLocaleString()}`}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isLoading && result ? (
            <ActionPanel.Section>
              <Action.Paste
                title={
                  source.frontApp && source.frontApp !== "Raycast"
                    ? `Paste to ${source.frontApp}`
                    : "Paste in Active App"
                }
                content={result}
              />
              <Action.CopyToClipboard
                title="Copy Rewrite"
                content={result}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            {isLoading ? (
              <Action
                title="Cancel Rewrite"
                icon={Icon.Stop}
                onAction={() => abortable.current?.abort()}
                // Cancellation convention: this does not pin an item.
                // eslint-disable-next-line @raycast/prefer-common-shortcut
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            ) : (
              <Action
                title={message ? "Retry Rewrite" : "Rewrite Again"}
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            )}
            <Action
              title={showOriginal ? "Show Rewrite" : "Show Original"}
              icon={Icon.Document}
              onAction={() => setShowOriginal((value) => !value)}
              // Toggle the source preview rather than opening an item.
              // eslint-disable-next-line @raycast/prefer-common-shortcut
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action.CopyToClipboard
              title="Copy Original"
              content={source.text}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
            <Action.OpenInBrowser
              title="Open Setup Guide"
              url="https://github.com/msakowski/recast#setup"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
