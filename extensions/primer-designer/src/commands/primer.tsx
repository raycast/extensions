import { Action, ActionPanel, Detail, Form, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { designPrimers } from "../lib/bio";
import { buildMarkdown } from "../lib/format";

type FormValues = {
  sequence: string;
  primerLength: string;
};

export default function PrimerCommand() {
  const [submitted, setSubmitted] = useState(false);
  const [sequence, setSequence] = useState("");
  const [primerLength, setPrimerLength] = useState("20");

  // Only compute after submit so the UI is calmer (and faster).
  const result = useMemo(() => {
    if (!submitted) return null;

    const n = Number.parseInt(primerLength, 10);
    const len = Number.isFinite(n) && n > 0 ? n : 20;

    return designPrimers(sequence, len);
  }, [submitted, sequence, primerLength]);

  if (!submitted) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Design Primers"
              onSubmit={async (values: FormValues) => {
                const seq = (values.sequence ?? "").trim();
                const len = (values.primerLength ?? "").trim();

                if (!seq) {
                  await showToast({ style: Toast.Style.Failure, title: "Paste a DNA sequence first." });
                  return;
                }

                setSequence(seq);
                setPrimerLength(len || "20");
                setSubmitted(true);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="sequence"
          title="Sequence"
          placeholder="Paste DNA sequence (A/T/G/C). Non-ATGC characters will be ignored."
          value={sequence}
          onChange={setSequence}
        />
        <Form.TextField
          id="primerLength"
          title="Primer Length"
          placeholder="20"
          value={primerLength}
          onChange={setPrimerLength}
        />
      </Form>
    );
  }

  // In case something goes sideways, fail gracefully.
  if (!result) {
    return (
      <Detail
        markdown={"Something went wrong computing primers."}
        actions={
          <ActionPanel>
            <Action title="Back" onAction={() => setSubmitted(false)} />
          </ActionPanel>
        }
      />
    );
  }

  const md = buildMarkdown({
    cleanLen: result.cleanSequence.length,
    primerLen: result.primerLength,
    forward: result.forward,
    reverse: result.reverse,
    forwardGC: result.forwardGC,
    reverseGC: result.reverseGC,
    forwardTm: result.forwardTm,
    reverseTm: result.reverseTm,
  });

  const both = result.forward && result.reverse ? `Forward: ${result.forward}\nReverse: ${result.reverse}` : "";

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Back" onAction={() => setSubmitted(false)} />
          {result.forward ? <Action.CopyToClipboard title="Copy Forward Primer" content={result.forward} /> : null}
          {result.reverse ? <Action.CopyToClipboard title="Copy Reverse Primer" content={result.reverse} /> : null}
          {both ? <Action.CopyToClipboard title="Copy Both" content={both} /> : null}
        </ActionPanel>
      }
    />
  );
}
