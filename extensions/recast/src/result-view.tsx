import {
  ActionPanel,
  Action,
  Detail,
  Icon,
  Keyboard,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Preferences, TONE_DETAILS, formatModelName } from "./config";
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
  const [result, setResult] = useState("");
  const [partial, setPartial] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showOriginal, setShowOriginal] = useState(false);
  const [preferences, setPreferences] = useState(() =>
    getPreferenceValues<Preferences>(),
  );
  const pending = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(false);
  const run = useCallback(async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    const currentPreferences = getPreferenceValues<Preferences>();
    setPreferences(currentPreferences);
    setIsLoading(true);
    setPartial("");
    setError(undefined);
    try {
      const text = await rewrite({
        text: source.text,
        tone,
        customInstruction: instruction,
        preferences: currentPreferences,
        signal: controller.signal,
        onPartial: (value) => {
          if (
            mounted.current &&
            pending.current === controller &&
            !controller.signal.aborted
          )
            setPartial(value);
        },
      });
      if (
        mounted.current &&
        pending.current === controller &&
        !controller.signal.aborted
      )
        setResult(text);
    } catch (err) {
      if (mounted.current && pending.current === controller)
        setError(rewriteError(err));
    } finally {
      if (mounted.current && pending.current === controller) {
        setIsLoading(false);
        setPartial("");
      }
      if (pending.current === controller) pending.current = undefined;
    }
  }, [source.text, tone, instruction]);
  useEffect(() => {
    mounted.current = true;
    void run();
    return () => {
      mounted.current = false;
      pending.current?.abort();
      pending.current = undefined;
    };
  }, [run]);

  const title = instruction
    ? "Custom Rewrite"
    : `${TONE_DETAILS[tone]?.title || "Neutral"} Rewrite`;
  const visible = showOriginal ? source.text : isLoading ? partial : result;
  const markdown = [
    showOriginal ? "# Original" : `# ${title}`,
    error ? `> ${error}` : isLoading ? "Rewriting with Amazon Bedrock…" : "",
    result && error && !showOriginal ? "Previous completed rewrite:" : "",
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
                onAction={() => pending.current?.abort()}
                shortcut={Keyboard.Shortcut.Common.Pin}
              />
            ) : (
              <Action
                title={error ? "Retry Rewrite" : "Rewrite Again"}
                icon={Icon.ArrowClockwise}
                onAction={run}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            )}
            <Action
              title={showOriginal ? "Show Rewrite" : "Show Original"}
              icon={Icon.Document}
              onAction={() => setShowOriginal((value) => !value)}
              shortcut={Keyboard.Shortcut.Common.Open}
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
