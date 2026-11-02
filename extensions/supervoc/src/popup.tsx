import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { fenced } from "./fenced";
import { pasteIntoFrontApp } from "./paste-into-front-app";
import {
  capture,
  quickTranslation,
  saveCandidate,
  type Candidate,
  type SaveOutcome,
} from "./supervoc-api";

function candidateMarkdown(candidate: Candidate): string {
  const hint = candidate.associationHint;
  const sharedRoot = hint.sharedRoot
    ? ` (shared root: ${hint.sharedRoot})`
    : "";
  return [
    `## ${candidate.lemma}`,
    `*${candidate.sense}*`,
    fenced(candidate.translation),
    candidate.explanation,
    "### Usage examples",
    candidate.usageExamples
      .map((example) => `- ${example.target}\n  ${example.native}`)
      .join("\n"),
    "### Association hint",
    `${hint.language}: **${hint.word}**${sharedRoot}`,
  ].join("\n\n");
}

function outcomeAccessory(outcome: SaveOutcome): List.Item.Accessory {
  if (outcome.status === "failed") {
    return {
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      tooltip: `Save failed: ${outcome.message}`,
    };
  }
  return outcome.saved.created
    ? {
        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
        tooltip: "Saved",
      }
    : {
        icon: { source: Icon.CheckCircle, tintColor: Color.Blue },
        tooltip: "Already saved, new context added",
      };
}

function PasteAndCopyActions({ text }: { text: string }) {
  return (
    <>
      <Action
        title="Paste Translation"
        icon={Icon.Clipboard}
        onAction={() => pasteIntoFrontApp(text)}
      />
      <Action.CopyToClipboard title="Copy Translation" content={text} />
    </>
  );
}

export function PopupView({
  text,
  context,
}: {
  text: string;
  context: string;
}) {
  const quick = usePromise(quickTranslation, [text]);
  const captured = usePromise(capture, [text, context], {
    onData: (result) => {
      const failed = result.candidates.filter(
        (row) => row.outcome.status === "failed",
      ).length;
      const saved = result.candidates.length - failed;
      showToast(
        failed
          ? {
              style: Toast.Style.Failure,
              title: `${failed} of ${result.candidates.length} saves failed`,
              message: "Select a red row and press ⌘S to retry",
            }
          : { style: Toast.Style.Success, title: `Saved ${saved} entries` },
      );
    },
  });
  const [retriedOutcomes, setRetriedOutcomes] = useState<
    Record<number, SaveOutcome>
  >({});

  async function retrySave(index: number, candidate: Candidate) {
    if (!captured.data) return;
    const outcome = await saveCandidate(candidate, captured.data.context);
    setRetriedOutcomes((current) => ({ ...current, [index]: outcome }));
  }

  return (
    <List
      navigationTitle="Supervoc"
      isLoading={quick.isLoading || captured.isLoading}
      isShowingDetail
    >
      <List.Section title="Quick translation">
        {quick.data !== undefined && (
          <List.Item
            title={quick.data}
            icon={Icon.Globe}
            detail={<List.Item.Detail markdown={fenced(quick.data)} />}
            actions={
              <ActionPanel>
                <PasteAndCopyActions text={quick.data} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Analysis">
        {captured.data?.candidates.map((row, index) => {
          const { candidate } = row;
          const outcome = retriedOutcomes[index] ?? row.outcome;
          return (
            <List.Item
              key={`${candidate.kind}-${candidate.lemma}`}
              title={candidate.lemma}
              subtitle={candidate.translation}
              accessories={[{ tag: candidate.kind }, outcomeAccessory(outcome)]}
              detail={
                <List.Item.Detail markdown={candidateMarkdown(candidate)} />
              }
              actions={
                <ActionPanel>
                  {outcome.status === "failed" && (
                    <Action
                      title="Retry Save"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Save}
                      onAction={() => retrySave(index, candidate)}
                    />
                  )}
                  <PasteAndCopyActions text={candidate.translation} />
                  <Action.CopyToClipboard
                    title="Copy Lemma"
                    content={candidate.lemma}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
