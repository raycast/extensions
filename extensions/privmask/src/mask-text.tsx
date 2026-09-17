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

type DetectResponse = {
  findings: Finding[];
  modelRan: boolean;
  notices: string[];
  dictionaryTermCount: number;
};

type Preferences = {
  useModel: boolean;
  dictionaryPath?: string;
};

const KIND_LABELS: Record<string, string> = {
  personalName: "Name",
  organizationName: "Organisation",
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

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState<string | null>(null);
  const [response, setResponse] = useState<DetectResponse | null>(null);
  // Deselections are tracked rather than selections, so that a finding stays
  // excluded when the model's results arrive and the list is rebuilt.
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [waitingForModel, setWaitingForModel] = useState(true);
  const [masked, setMasked] = useState<string>("");
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
          await showToast({
            style: Toast.Style.Failure,
            title: "Name detection failed",
            message: String(error),
          });
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

  const findings = response?.findings ?? [];
  const selected = useMemo(() => findings.filter((finding) => !deselected.has(finding.id)), [findings, deselected]);

  useEffect(() => {
    let cancelled = false;
    if (input === null) return;

    (async () => {
      const result = (await maskText({ text: input, selected })) as { text: string };
      if (!cancelled) setMasked(result.text);
    })().catch((error) => {
      if (!cancelled) setFailure(String(error));
    });

    return () => {
      cancelled = true;
    };
  }, [input, selected]);

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
  const preview = "```\n" + (masked || input || "") + "\n```";

  const actions = (finding?: Finding) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Masked Text" content={masked} icon={Icon.Clipboard} />
        <Action.Paste
          title="Paste Masked Text"
          content={masked}
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
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
    <List
      isLoading={input === null || waitingForModel}
      isShowingDetail
      navigationTitle={findings.length > 0 ? `${selected.length} of ${findings.length} will be masked` : "Privacy Mask"}
      searchBarPlaceholder="Filter what was found"
    >
      {notices.length > 0 && (
        <List.Section title="Worth knowing">
          {notices.map((notice, index) => (
            <List.Item
              key={`notice-${index}`}
              icon={{ source: Icon.Info, tintColor: Color.Blue }}
              title={notice}
              detail={<List.Item.Detail markdown={preview} />}
              actions={actions()}
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Found in this text" subtitle={findings.length > 0 ? `${findings.length}` : undefined}>
        {findings.map((finding) => {
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
                  markdown={preview}
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
