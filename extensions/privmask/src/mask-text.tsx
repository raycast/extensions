import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  getPreferenceValues,
  getSelectedText,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { detectFast, detectFull, maskText } from "swift:../swift/privmask-bridge";

type Finding = {
  id: string;
  kind: string;
  confidence: "high" | "medium" | "low";
  sources: string[];
  text: string;
  location: number;
  length: number;
};

type Replacement = {
  original: string;
  placeholder: string;
  kind: string;
  location: number;
  length: number;
};

type DetectResponse = {
  findings: Finding[];
  modelRan: boolean;
  notices: string[];
  dictionaryTermCount: number;
};

const KIND_LABELS: Record<string, string> = {
  personalName: "Name",
  organizationName: "Organization",
  address: "Address",
  postalCode: "Postal code",
  phoneNumber: "Phone",
  email: "Email",
  myNumber: "My Number",
  credential: "Secret",
  dictionaryTerm: "Your term",
  placeName: "Place",
};

const SOURCE_LABELS: Record<string, string> = {
  regex: "pattern",
  dictionary: "your term list",
  credentialContext: "the name introducing the value",
  dataDetector: "macOS data detector",
  nameTagger: "macOS name tagger",
  languageModel: "on-device model",
  ner: "privmask name model",
};

// Confidence is the primary signal: red is structurally certain, yellow is a
// judgement the model made and you should look at.
const CONFIDENCE_COLOURS: Record<Finding["confidence"], Color> = {
  high: Color.Red,
  medium: Color.Orange,
  low: Color.Yellow,
};

/** The text to work on: whatever is selected, else the clipboard. */
async function readInput(): Promise<string> {
  try {
    const selected = await getSelectedText();
    if (selected.trim().length > 0) return selected;
  } catch {
    // Nothing selected, or the front app does not expose a selection.
  }
  return (await Clipboard.readText()) ?? "";
}

/** Whether the masker substituted exactly this finding. */
function isReplacementOf(replacement: Replacement, finding: Finding) {
  return (
    replacement.location === finding.location &&
    replacement.length === finding.length &&
    replacement.kind === finding.kind
  );
}

/** Keeps a path's underscores and brackets out of the markdown renderer. */
function escapeMarkdown(value: string) {
  // As character references, not backslash escapes: Raycast reads `\[ … \]`
  // and `\( … \)` as LaTeX, so escaping a bracket would start an equation.
  return value.replace(/[!-/:-@[-`{-~]/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * The text as markdown, with every occurrence of `highlight` picked out.
 *
 * Not a code block, which would keep the text's layout but cannot carry
 * emphasis. The layout that matters is kept by hand instead: each line break,
 * and runs of spaces, which markdown would otherwise collapse.
 */
function renderPreview(text: string, highlight?: string) {
  const escape = (value: string) =>
    escapeMarkdown(value).replace(/^ +| {2,}/g, (spaces) => "\u00a0".repeat(spaces.length));
  // Inline code, not bold: CommonMark does not open `**` between a Japanese
  // character and punctuation, which is where a placeholder sits. A placeholder
  // never holds a backtick, but text left alone might; doubled backticks with
  // spaces inside hold one.
  const mark = highlight?.includes("`") ? `\`\` ${highlight} \`\`` : `\`${highlight}\``;
  return (
    text
      .split("\n")
      // A blank line holds a space, or markdown would merge it into the break.
      .map((row) => (highlight ? row.split(highlight).map(escape).join(mark) : escape(row)) || "\u00a0")
      .join("  \n")
  );
}

/**
 * Why ⏎ did nothing. The bar this appears in is narrow and elides the message,
 * so the title carries the part that matters: nothing reached the clipboard.
 */
async function sayNotReady(message: string) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Nothing copied yet",
    message,
  });
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState<string | null>(null);
  const [response, setResponse] = useState<DetectResponse | null>(null);
  // Deselections are tracked rather than selections, so that a finding stays
  // excluded when the model's results arrive and the list is rebuilt.
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [waitingForModel, setWaitingForModel] = useState(true);
  // The masked text, together with the selection it was computed from. Copying
  // is offered only when that selection is the one on screen: a result from
  // before the model returned, or from before the last ⌘T, is missing exactly
  // what the user is trying to remove.
  const [masked, setMasked] = useState<{ text: string; of: string; replacements: Replacement[] } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const text = await readInput();
      if (cancelled) return;
      setInput(text);

      if (text.trim().length === 0) {
        setWaitingForModel(false);
        return;
      }

      const request = {
        text,
        dictionaryPath: preferences.dictionaryPath?.trim() || null,
        useModel: preferences.useModel,
        useNameModel: preferences.useNameModel,
        nameModelPath: preferences.nameModelPath?.trim() || null,
      };

      try {
        const fast = (await detectFast(request)) as DetectResponse;
        if (!cancelled) setResponse(fast);
      } catch (error) {
        if (!cancelled) setFailure(String(error));
        return;
      }

      try {
        const full = (await detectFull(request)) as DetectResponse;
        if (!cancelled) setResponse(full);
      } catch (error) {
        // The deterministic findings are already on screen; keep them and say
        // what was lost rather than replacing the list with an error.
        if (!cancelled) {
          await showFailureToast(error, { title: "Name detection failed" });
        }
      } finally {
        if (!cancelled) setWaitingForModel(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately runs once. The input is whatever was selected or on the
    // clipboard when the command opened; re-reading it later would change the
    // text out from under a review the user is in the middle of.
  }, []);

  // Memoised for its identity, not its cost: a fresh [] on every render would
  // make `selected` new too, re-running the masking effect, whose setState
  // renders again. While `response` is null — an empty input, or a failed
  // scan — that is a loop with nothing to stop it.
  const findings = useMemo(() => response?.findings ?? [], [response]);
  const selected = useMemo(() => findings.filter((finding) => !deselected.has(finding.id)), [findings, deselected]);
  const selectionKey = useMemo(() => selected.map((finding) => finding.id).join("\u0000"), [selected]);

  useEffect(() => {
    let cancelled = false;
    if (input === null) return;

    (async () => {
      const result = (await maskText({ text: input, selected })) as { text: string; replacements: Replacement[] };
      if (!cancelled) setMasked({ text: result.text, of: selectionKey, replacements: result.replacements });
    })().catch((error) => {
      if (!cancelled) setFailure(String(error));
    });

    return () => {
      cancelled = true;
    };
  }, [input, selected, selectionKey]);

  // Of two overlapping findings, only the longer is substituted. One that lies
  // inside another's replacement has already gone with it, so listing it would
  // offer a choice that changes nothing, and say "left as it is" of text that
  // is not. It is left out until the longer one is left alone. Containment,
  // not overlap: the longer one, left alone, overlaps the shorter's
  // replacement, and must stay listed so it can be masked again.
  const shown = useMemo(() => {
    const replacements = masked?.replacements ?? [];
    return findings.filter(
      (finding) =>
        !replacements.some(
          (replacement) =>
            !isReplacementOf(replacement, finding) &&
            replacement.location <= finding.location &&
            finding.location + finding.length <= replacement.location + replacement.length,
        ),
    );
  }, [findings, masked]);
  const shownMasked = shown.filter((finding) => !deselected.has(finding.id)).length;

  function toggle(id: string) {
    setDeselected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const notices = response?.notices ?? [];
  const previewText = masked?.text || input || "";
  /**
   * Where a finding is in the preview: its own placeholder, which every
   * occurrence of the same value shares, or the text itself while it is left
   * alone. Matched by position, so a finding left alone is not pointed at
   * another occurrence that was replaced.
   */
  const previewOf = (finding: Finding) =>
    renderPreview(
      previewText,
      masked?.replacements.find((replacement) => isReplacementOf(replacement, finding))?.placeholder ?? finding.text,
    );
  // Both halves have to be current: the scan, and the masking of what it found.
  const ready = !waitingForModel && masked?.of === selectionKey;
  const maskedText = masked?.text ?? "";
  // Two different waits, and saying the wrong one is its own small lie.
  const waitingFor = waitingForModel ? "Still checking this text for names." : "Still applying your choices.";

  const actions = (finding?: Finding) => (
    <ActionPanel>
      <ActionPanel.Section>
        {ready && <Action.CopyToClipboard title="Copy Masked Text" content={maskedText} icon={Icon.Clipboard} />}
        {ready && (
          <Action.Paste
            title="Paste Masked Text"
            content={maskedText}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        )}
        {!ready && <Action title="Copy Masked Text" icon={Icon.Clipboard} onAction={() => sayNotReady(waitingFor)} />}
        {!ready && (
          <Action
            title="Paste Masked Text"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={() => sayNotReady(waitingFor)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {finding && (
          <Action
            title={deselected.has(finding.id) ? "Mask This" : "Leave This Alone"}
            icon={deselected.has(finding.id) ? Icon.CheckCircle : Icon.Circle}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => toggle(finding.id)}
          />
        )}
        <Action
          title="Mask Everything Found"
          icon={Icon.CheckCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={() => setDeselected(new Set())}
        />
        <Action
          title="Leave Everything Alone"
          icon={Icon.Circle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => setDeselected(new Set(findings.map((item) => item.id)))}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  if (failure) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Could not check this text" description={failure} />
      </List>
    );
  }

  if (input !== null && input.trim().length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Nothing to mask"
          description="Select some text, or copy it, then run this command again."
        />
      </List>
    );
  }

  return (
    <List isLoading={input === null || waitingForModel} isShowingDetail searchBarPlaceholder="Filter what was found">
      {notices.length > 0 && (
        <List.Section title="Worth knowing">
          {notices.map((notice, index) => (
            <List.Item
              key={`notice-${index}`}
              icon={{ source: Icon.Info, tintColor: Color.Blue }}
              title={notice}
              // A notice names a path or a count, and the list column is too
              // narrow to read one. The detail pane is where the sentence fits.
              detail={<List.Item.Detail markdown={`${escapeMarkdown(notice)}\n\n${renderPreview(previewText)}`} />}
              actions={actions()}
            />
          ))}
        </List.Section>
      )}

      <List.Section
        title="Found in this text"
        subtitle={shown.length > 0 ? `${shownMasked} of ${shown.length} will be masked` : undefined}
      >
        {shown.map((finding) => {
          const isMasked = !deselected.has(finding.id);
          return (
            <List.Item
              key={finding.id}
              icon={{
                source: isMasked ? Icon.CheckCircle : Icon.Circle,
                tintColor: isMasked ? CONFIDENCE_COLOURS[finding.confidence] : Color.SecondaryText,
              }}
              title={finding.text}
              subtitle={KIND_LABELS[finding.kind] ?? finding.kind}
              accessories={[{ tag: { value: finding.confidence, color: CONFIDENCE_COLOURS[finding.confidence] } }]}
              detail={
                <List.Item.Detail
                  markdown={previewOf(finding)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Found" text={finding.text} />
                      <List.Item.Detail.Metadata.Label title="Kind" text={KIND_LABELS[finding.kind] ?? finding.kind} />
                      <List.Item.Detail.Metadata.TagList title="Confidence">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={finding.confidence}
                          color={CONFIDENCE_COLOURS[finding.confidence]}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Detected by"
                        text={finding.sources.map((source) => SOURCE_LABELS[source] ?? source).join(", ")}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Will be" text={isMasked ? "replaced" : "left as it is"} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions(finding)}
            />
          );
        })}
      </List.Section>

      {!waitingForModel && findings.length === 0 && (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Nothing personal found"
          description="The text looks safe to share as it is."
        />
      )}
    </List>
  );
}
