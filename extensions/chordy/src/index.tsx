import { Form, ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { chordStringToScaleNotes, ParseError, ScaleName } from "./lib/chords";

type Values = {
  rootNote: string;
  scale: ScaleName;
};

export function ResultMarkdownFrame({
  noteRoot,
  scaleChord,
  outputNotes,
}: {
  noteRoot: string | null;
  scaleChord: string | null;
  outputNotes: string | null;
}) {
  const md = `
  # ${outputNotes}\n
  ## Description\n

  Root selected: ${noteRoot}\n
  Scale selected: ${scaleChord}\n

  *Output*: ${outputNotes}
  `;

  return <Detail navigationTitle="Chord" markdown={md} />;
}

export default function Command() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submittedError, setSubmittedError] = useState<string | null>(null);
  const [rootNote, setRootNote] = useState<string | null>(null);
  const [scale, setScale] = useState<ScaleName | null>(null);
  const [outputNotes, setNotes] = useState<string | null>(null);

  // wip: include more scales later on
  function selectScale(scale: ScaleName): ScaleName {
    if (scale === ScaleName.Minor) {
      return ScaleName.Minor;
    }
    return ScaleName.Major;
  }

  function handleSubmit(values: Values): void {
    // require root or scale to be present (dropdown will provide it when selected)
    // ROOT NOTE VERIFY
    console.log("Submitted values:", values);

    if (!values.rootNote) {
      const msg = "Please define a root note (C, D, E, F, G, A, B).";
      setSubmittedError(msg);
      showToast({ title: "Missing selection", message: msg, style: Toast.Style.Failure });
      return;
    }

    // SCALE VERIFY
    if (!values.scale) {
      const msg = "Please select a scale (Major or Minor).";
      setSubmittedError(msg);
      showToast({ title: "Missing selection", message: msg, style: Toast.Style.Failure });
      return;
    }

    try {
      const rootNote: string = values.rootNote;
      const scale: ScaleName = selectScale(values.scale);
      const chordNotes: string = chordStringToScaleNotes(rootNote, scale);

      setRootNote(rootNote);
      setScale(scale);
      setNotes(chordNotes);

      setSubmittedError(null);
      setSubmitted(values.rootNote);

      showToast({ title: "Chord translated", message: `Chord ${values.rootNote} submitted successfully` });
    } catch (err) {
      if (err instanceof ParseError) {
        setSubmittedError(err.message);
        setSubmitted(null);
      } else if (err instanceof Error) {
        setSubmittedError(err.message);
        setSubmitted(null);
      } else {
        setSubmittedError("Unexpected error while parsing chord");
        setSubmitted(null);
      }
    }
  }

  if (submitted || submittedError) {
    return ResultMarkdownFrame({
      noteRoot: rootNote,
      scaleChord: scale,
      outputNotes: outputNotes,
    });
  }

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        {/* ROOT NOTE SELECTION */}
        <Form.Dropdown id="rootNote" title="Define Root note" placeholder="C" storeValue={false}>
          <Form.Dropdown.Item value="C" title="C" />
          <Form.Dropdown.Item value="D" title="D" />
          <Form.Dropdown.Item value="E" title="E" />
          <Form.Dropdown.Item value="F" title="F" />
          <Form.Dropdown.Item value="G" title="G" />
          <Form.Dropdown.Item value="A" title="A" />
          <Form.Dropdown.Item value="B" title="B" />
        </Form.Dropdown>

        {/* SCALE SELECTION */}
        <Form.Dropdown id="scale" title="Scale" defaultValue={ScaleName.Major} storeValue={false}>
          <Form.Dropdown.Item value={ScaleName.Major} title="Major" />
          <Form.Dropdown.Item value={ScaleName.Minor} title="Minor" />
        </Form.Dropdown>
      </Form>
    </>
  );
}
