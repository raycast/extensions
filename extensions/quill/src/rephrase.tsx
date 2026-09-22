import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  getSelectedText,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { fmTransform, LicenseNotAgreedError } from "./fm";
import { rephraseInstructions, ToneId, TONES, toneTitle } from "./instructions";
import { LicenseDetail } from "./license";

async function readSelection() {
  let original: string;
  try {
    original = await getSelectedText();
  } catch {
    throw new Error("No text selected");
  }
  if (!original.trim()) throw new Error("No text selected");
  return original;
}

// Drop the finished view so the next launch starts from a clean state instead
// of showing the previous result.
const resetView = () => popToRoot({ clearSearchBar: true });

export default function Rephrase() {
  const { defaultTone } = getPreferenceValues<Preferences.Rephrase>();
  // The last tone picked wins; the preference only applies until one is picked.
  const {
    value: storedTone,
    setValue: setTone,
    isLoading: isLoadingTone,
  } = useLocalStorage<ToneId>("tone");
  const tone = storedTone ?? (defaultTone as ToneId);

  // The selection is read once: it is gone once Raycast has focus, so changing
  // the tone must re-run only the rewrite.
  const selection = usePromise(readSelection);
  const rephrase = usePromise(
    (original: string, tone: ToneId) =>
      fmTransform(rephraseInstructions(tone), original),
    [selection.data ?? "", tone],
    { execute: selection.data !== undefined && !isLoadingTone },
  );

  const error = selection.error ?? rephrase.error;
  if (error instanceof LicenseNotAgreedError) {
    return <LicenseDetail />;
  }

  if (error) {
    return <Detail markdown={`## ${error.message}`} />;
  }

  const original = selection.data;
  const rephrased = rephrase.data;
  if (original === undefined || rephrased === undefined || rephrase.isLoading) {
    return <Detail isLoading markdown="Rephrasing…" />;
  }

  return (
    <Detail
      markdown={`${rephrased}\n\n---\n\n_Original:_\n\n> ${original.replace(/\n/g, "\n> ")}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Tone" text={toneTitle(tone)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Paste
            title="Replace Selection"
            content={rephrased}
            onPaste={resetView}
          />
          <Action.CopyToClipboard
            title="Copy Rephrased Text"
            content={rephrased}
            onCopy={resetView}
          />
          <ActionPanel.Submenu
            title="Change Tone"
            icon={Icon.SpeechBubble}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          >
            {TONES.map((t) => (
              <Action
                key={t.id}
                title={t.title}
                icon={t.id === tone ? Icon.Checkmark : Icon.Circle}
                onAction={() => setTone(t.id)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
