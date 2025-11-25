import { Form, ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { chordStringToScaleNotes, ParseError, ScaleName } from "./lib/chords";

type Values = {
  rootNote: string;
  scale: ScaleName;
};

const ROOT_NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;

type ChordResult = {
  rootNote: string;
  scale: ScaleName;
  outputNotes: string;
};

function ResultMarkdownFrame({ rootNote, scale, outputNotes }: ChordResult) {
  const markdown = `# ${outputNotes}

## ${rootNote} ${scale.charAt(0).toUpperCase() + scale.slice(1)} Scale

**Notes:** ${outputNotes}
`;

  return <Detail navigationTitle={`Chord: ${rootNote} ${scale}`} markdown={markdown} />;
}

export default function Command() {
  const [result, setResult] = useState<ChordResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(values: Values): void {
    if (!values.rootNote) {
      const msg = "Please define a root note (C, D, E, F, G, A, B).";
      setError(msg);
      showToast({ title: "Missing selection", message: msg, style: Toast.Style.Failure });
      return;
    }

    if (!values.scale) {
      const msg = "Please select a scale (Major or Minor).";
      setError(msg);
      showToast({ title: "Missing selection", message: msg, style: Toast.Style.Failure });
      return;
    }

    try {
      const outputNotes = chordStringToScaleNotes(values.rootNote, values.scale);
      const chordResult: ChordResult = {
        rootNote: values.rootNote,
        scale: values.scale,
        outputNotes,
      };

      setResult(chordResult);
      setError(null);
      showToast({ title: "Chord translated", message: `${values.rootNote} ${values.scale} scale` });
    } catch (err) {
      const errorMessage =
        err instanceof ParseError || err instanceof Error ? err.message : "Unexpected error while parsing chord";

      setError(errorMessage);
      setResult(null);
      showToast({ title: "Error", message: errorMessage, style: Toast.Style.Failure });
    }
  }

  if (result) {
    return <ResultMarkdownFrame {...result} />;
  }

  if (error) {
    return (
      <Detail
        navigationTitle="Error"
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={() => setError(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="rootNote" title="Root Note" placeholder="Select root note" storeValue={false}>
        {ROOT_NOTES.map((note) => (
          <Form.Dropdown.Item key={note} value={note} title={note} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="scale" title="Scale" defaultValue={ScaleName.Major} storeValue={false}>
        <Form.Dropdown.Item value={ScaleName.Major} title="Major" />
        <Form.Dropdown.Item value={ScaleName.Minor} title="Minor" />
      </Form.Dropdown>
    </Form>
  );
}
