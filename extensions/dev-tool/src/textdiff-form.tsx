import { Action, ActionPanel, Detail, Form } from "@raycast/api";
import { useState } from "react";

/* =========================
 * Diff Logic
 * ========================= */

type DiffLine = {
  type: "same" | "diff" | "add" | "remove";
  left?: string;
  right?: string;
};

function diffLines(left: string, right: string, ignoreCase: boolean, ignoreEmpty: boolean): DiffLine[] {
  let a = left.split("\n");
  let b = right.split("\n");

  if (ignoreEmpty) {
    a = a.filter((l) => l.trim() !== "");
    b = b.filter((l) => l.trim() !== "");
  }

  const max = Math.max(a.length, b.length);
  const result: DiffLine[] = [];

  for (let i = 0; i < max; i++) {
    const l = a[i];
    const r = b[i];

    if (l === undefined) {
      result.push({ type: "add", right: r });
    } else if (r === undefined) {
      result.push({ type: "remove", left: l });
    } else {
      const lcmp = ignoreCase ? l.toLowerCase() : l;
      const rcmp = ignoreCase ? r.toLowerCase() : r;

      if (lcmp === rcmp) {
        result.push({ type: "same", left: l });
      } else {
        result.push({ type: "diff", left: l, right: r });
      }
    }
  }

  return result;
}

/* =========================
 * Markdown Render
 * ========================= */

function renderMarkdown(lines: DiffLine[]) {
  const out: string[] = [];

  lines.forEach((line, i) => {
    const no = (i + 1).toString().padStart(3, " ");

    switch (line.type) {
      case "same":
        out.push(` ${no} │ ${line.left}`);
        break;
      case "diff":
        out.push(`🔴 ${no} │ A: ${line.left}`);
        out.push(`🔴 ${no} │ B: ${line.right}`);
        break;
      case "add":
        out.push(`➕ ${no} │ ${line.right}`);
        break;
      case "remove":
        out.push(`➖ ${no} │ ${line.left}`);
        break;
    }
  });

  return "```\n" + out.join("\n") + "\n```";
}

/* =========================
 * Command
 * ========================= */

export default function Command() {
  const [markdown, setMarkdown] = useState<string | null>(null);

  if (markdown) {
    return (
      <Detail
        markdown={`## Text Diff Result\n${markdown}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={markdown} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Compare"
            onSubmit={(values) => {
              const diff = diffLines(values.left, values.right, values.ignoreCase, values.ignoreEmpty);
              setMarkdown(renderMarkdown(diff));
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="left" title="Text A" />
      <Form.TextArea id="right" title="Text B" />

      <Form.Checkbox id="ignoreCase" label="Ignore Case" defaultValue={false} />
      <Form.Checkbox id="ignoreEmpty" label="Ignore Empty Lines" defaultValue={true} />
    </Form>
  );
}
