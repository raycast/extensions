import { execFile } from "node:child_process";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { detectFast, detectFull, isWindowOnScreen, maskText } from "swift:../swift/privmask-bridge";

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

/**
 * Puts text on the clipboard and leaves the window alone.
 *
 * Not `Clipboard.copy`: since Raycast 2.4.1 that dismisses the main window
 * (raycast/extensions#31273), which would close the review the moment it
 * became readable. `pbcopy` writes the same pasteboard, so Clipboard History
 * still records it, and Raycast never hears about it. The locale is set
 * because `pbcopy` in the C locale mangles anything beyond ASCII.
 * ponytail: back to Clipboard.copy once #31273 is fixed.
 */
function copyQuietly(text: string) {
  return new Promise<void>((resolve, reject) => {
    const child = execFile("/usr/bin/pbcopy", { env: { ...process.env, LC_ALL: "en_US.UTF-8" } }, (error) =>
      error ? reject(error) : resolve(),
    );
    child.stdin?.on("error", reject);
    child.stdin?.end(text);
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  // never holds a backtick, but text left alone might: a code span holds any
  // run of backticks shorter than its delimiter, padded with a space.
  const longestRun = Math.max(0, ...(highlight?.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  const mark = longestRun > 0 ? `${fence} ${highlight} ${fence}` : `${fence}${highlight}${fence}`;
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
  // The masked text, together with the input and the selection it was computed
  // from. Copying is offered only when both are the ones on screen: a result
  // from before the model returned, from before the last ⌘T, or from the text
  // before the last ⌘V, is missing exactly what the user is trying to remove.
  const [masked, setMasked] = useState<{
    text: string;
    input: string;
    of: string;
    replacements: Replacement[];
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // Why the name scan threw, when it did. The deterministic findings stay on
  // screen then, but the text is not auto-copied: a toast is the only place
  // the failure is reported, and the copy's own toast would replace it.
  const [nameScanFailed, setNameScanFailed] = useState<string | null>(null);
  // What this command last put on the clipboard. Reading the clipboard back
  // instead would not tell our own copy from the user's, and would re-mask
  // the masked text when ⌘V is pressed out of habit.
  const lastCopied = useRef<string | null>(null);
  // Copies are queued one after another, so the newest result is written
  // last. Each is a separate process, and one started earlier can finish
  // later; the clipboard would then hold a result the user had moved on from.
  const copies = useRef<Promise<unknown>>(Promise.resolve());
  // Bumped whenever the text changes, and on unmount, so a copy queued for an
  // earlier text is dropped rather than landing, toast and all, on the next.
  const generation = useRef(0);

  /** Starts over on `text`, as if the command had been opened with it. */
  function start(text: string) {
    setInput(text);
    setResponse(null);
    setDeselected(new Set());
    setMasked(null);
    setFailure(null);
    setNameScanFailed(null);
    setWaitingForModel(text.trim().length > 0);
    // Forgotten with the text it was made from: the next text's result can be
    // the same string, and the clipboard would then be left holding the next
    // text unmasked.
    lastCopied.current = null;
    generation.current += 1;
  }

  useEffect(() => {
    let cancelled = false;
    readInput()
      .then((text) => {
        if (!cancelled) start(text);
      })
      .catch((error) => {
        if (!cancelled) setFailure(String(error));
      });
    return () => {
      cancelled = true;
      generation.current += 1;
    };
  }, []);

  useEffect(() => {
    if (input === null || input.trim().length === 0) return;
    let cancelled = false;

    (async () => {
      const request = {
        text: input,
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
          setNameScanFailed(String(error));
          await showFailureToast(error, { title: "Name detection failed" });
        }
      } finally {
        if (!cancelled) setWaitingForModel(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs again only when the input does, and the input changes only on ⌘V.
    // It is never re-read on its own: that would change the text out from
    // under a review the user is in the middle of.
  }, [input]);

  // Memoised for its identity, not its cost: a fresh [] on every render would
  // make `selected` new too, re-running the masking effect, whose setState
  // renders again. While `response` is null — an empty input, or a failed
  // scan — that is a loop with nothing to stop it.
  const findings = useMemo(() => response?.findings ?? [], [response]);
  const selected = useMemo(() => findings.filter((finding) => !deselected.has(finding.id)), [findings, deselected]);
  const selectionKey = useMemo(() => selected.map((finding) => finding.id).join("\u0000"), [selected]);

  useEffect(() => {
    let cancelled = false;
    if (input === null || input.trim().length === 0) return;

    (async () => {
      const result = (await maskText({ text: input, selected })) as { text: string; replacements: Replacement[] };
      if (!cancelled) setMasked({ text: result.text, input, of: selectionKey, replacements: result.replacements });
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

  // The wait for names is said here rather than by the fast scan, so that the
  // sentence to take back when the scan throws is this file's own.
  const notices = [
    ...(response?.notices ?? []),
    ...(response && waitingForModel && !nameScanFailed ? ["Looking for personal names…"] : []),
    ...(nameScanFailed ? [`Name detection failed (${nameScanFailed}), so personal names were not looked for.`] : []),
  ];
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
  // All of it has to be current: the scan, and the masking of what it found.
  const ready = !waitingForModel && masked?.input === input && masked?.of === selectionKey;
  const maskedText = masked?.text ?? "";
  const replaced = masked?.replacements.length ?? 0;
  // Two different waits, and saying the wrong one is its own small lie.
  const waitingFor = waitingForModel ? "Still checking this text for names." : "Still applying your choices.";

  // The clipboard follows the preview: whenever the masked text is current it
  // is copied, so that ⌘V in the next app is all that is left to do. A toast,
  // not a HUD, because a HUD closes the window the user may still be reading.
  // Not when the name scan threw: that text is missing exactly what the user
  // came for, and ⏎ still copies it once they have read why.
  useEffect(() => {
    if (!ready || nameScanFailed || maskedText === lastCopied.current) return;
    const text = maskedText;
    const of = generation.current;
    const title =
      findings.length === 0
        ? "Copied as it is, nothing personal found"
        : replaced === 0
          ? "Copied as it is, everything left alone"
          : `Masked text copied, ${replaced} replaced`;
    // Claimed before the write, so the same text is not queued twice; given
    // back when the write does not happen, so it can be tried again.
    lastCopied.current = text;
    copies.current = copies.current
      .then(async () => {
        // Held back while the window is hidden: the user may be copying
        // something else meanwhile, and would see neither the toast nor the
        // text it announces. Checked once a second until the window is back.
        // ponytail: gives up after five minutes; a view left open with "Pop
        // to Root Search" off would otherwise be checked forever.
        let visible = false;
        for (let tries = 0; !visible && tries < 300 && of === generation.current; tries++) {
          visible = (await isWindowOnScreen()) as boolean;
          if (!visible) await wait(1000);
        }
        if (of !== generation.current) return;
        if (!visible) {
          if (lastCopied.current === text) lastCopied.current = null;
          return;
        }
        await copyQuietly(text);
        await showToast({ style: Toast.Style.Success, title, message: "⌘V here masks what you copy next." });
      })
      .catch((error) => {
        if (lastCopied.current === text) lastCopied.current = null;
        return showFailureToast(error, { title: "Could not copy the masked text" });
      });
  }, [ready, nameScanFailed, maskedText, replaced, findings]);

  /** ⌘V: starts over on whatever is on the clipboard now. */
  async function maskClipboard() {
    let text: string;
    try {
      text = (await Clipboard.readText()) ?? "";
    } catch (error) {
      await showFailureToast(error, { title: "Could not read the clipboard" });
      return;
    }
    if (text.trim().length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to mask", message: "The clipboard is empty." });
      return;
    }
    if (text === lastCopied.current || text === input) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing new on the clipboard",
        message: text === input ? "It holds the text on screen." : "It holds the text just masked.",
      });
      return;
    }
    start(text);
  }

  const maskClipboardAction = (
    <Action
      title="Mask the Clipboard"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "v" }}
      onAction={maskClipboard}
    />
  );

  const actions = (finding?: Finding) => (
    <ActionPanel>
      <ActionPanel.Section>
        {ready && <Action.CopyToClipboard title="Copy Masked Text" content={maskedText} icon={Icon.CopyClipboard} />}
        {ready && (
          <Action.Paste
            title="Paste Masked Text"
            content={maskedText}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        )}
        {!ready && (
          <Action title="Copy Masked Text" icon={Icon.CopyClipboard} onAction={() => sayNotReady(waitingFor)} />
        )}
        {!ready && (
          <Action
            title="Paste Masked Text"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={() => sayNotReady(waitingFor)}
          />
        )}
        {maskClipboardAction}
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
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not check this text"
          description={failure}
          actions={<ActionPanel>{maskClipboardAction}</ActionPanel>}
        />
      </List>
    );
  }

  if (input !== null && input.trim().length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Nothing to mask"
          description="Select some text, or copy it, then run this command again — or copy it now and press ⌘V."
          actions={<ActionPanel>{maskClipboardAction}</ActionPanel>}
        />
      </List>
    );
  }

  // Loading for exactly as long as copying is held back, so the bar is what
  // tells the user the list and preview are not yet their latest choice.
  return (
    <List
      isLoading={input === null || !ready}
      isShowingDetail
      searchBarPlaceholder="Filter what was found — or copy the next text and press ⌘V"
    >
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

      {/* A row, not List.EmptyView: that takes the whole window, and the text
          itself is what the user wants to see beside the verdict. */}
      {!waitingForModel && findings.length === 0 && (
        <List.Item
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Nothing personal found"
          detail={<List.Item.Detail markdown={renderPreview(previewText)} />}
          actions={actions()}
        />
      )}
    </List>
  );
}
