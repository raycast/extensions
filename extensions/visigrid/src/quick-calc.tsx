import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  LaunchProps,
  Form,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { runVgrid, VgridMissingError } from "./vgrid";

/** Evaluate an Excel formula against CSV data from the clipboard.
 *  The clipboard is loaded into the grid at A1, exactly like
 *  `pbpaste | vgrid calc --from csv "<formula>"`. */

type CalcState =
  | { kind: "loading" }
  | { kind: "result"; formula: string; result: string; dataPreview: string }
  | { kind: "error"; message: string };

/** Real-world tables come off the clipboard three ways: tab-separated
 *  (cells copied from spreadsheet apps and most HTML email tables),
 *  space-aligned columns (Slack messages, code blocks, plain-text email),
 *  or genuine CSV text. Normalize the first two to clean TSV; only true
 *  comma-data stays CSV. */
function normalizeClipboard(clip: string): {
  data: string;
  format: "tsv" | "csv";
} {
  const lines = clip
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  let rows: string[][] | null = null;
  if (clip.includes("\t")) {
    rows = lines.map((l) => l.split("\t"));
  } else {
    // Space-aligned columns: most lines contain runs of 2+ spaces.
    const aligned = lines.filter((l) => / {2,}/.test(l.trim()));
    if (
      lines.length > 0 &&
      aligned.length >= Math.max(1, Math.floor(lines.length * 0.6))
    ) {
      rows = lines.map((l) => l.trim().split(/ {2,}/));
    }
  }

  if (!rows) return { data: clip, format: "csv" }; // raw CSV (or single column)

  const cleaned = rows
    .map((fields) => fields.map(cleanNumberish).join("\t"))
    .join("\n");
  return { data: cleaned, format: "tsv" };
}

/** "$28,500" → 28500, "1,234.50" → 1234.50, "(1,234)" → -1234.
 *  Anything that isn't money/number-shaped passes through untouched. */
function cleanNumberish(fieldRaw: string): string {
  const field = fieldRaw.trim();
  const m = field.match(
    /^\((\$?[\d,]+(?:\.\d+)?)\)$|^(-?\$?[\d,]+(?:\.\d+)?)$/,
  );
  if (!m) return field;
  const negative = m[1] !== undefined;
  const body = (m[1] ?? m[2]).replace(/[$,]/g, "");
  if (body === "" || isNaN(Number(body))) return field;
  return negative ? `-${body}` : body;
}

async function evaluate(
  formula: string,
): Promise<{ result: string; dataPreview: string }> {
  const clip = (await Clipboard.readText()) ?? "";
  // Literal formulas like =SUM(1,2,3) need no clipboard data — feed the
  // engine a single empty row so they evaluate on an empty grid.
  if (!clip.trim()) {
    const result = (
      await runVgrid(["calc", "--from", "csv", formula], "\n")
    ).trim();
    return { result, dataPreview: "(no clipboard data)" };
  }
  const { data, format } = normalizeClipboard(clip);
  const result = (
    await runVgrid(["calc", "--from", format, formula], data)
  ).trim();
  const lines = clip.trim().split("\n");
  const dataPreview =
    lines.slice(0, 6).join("\n") +
    (lines.length > 6 ? `\n… ${lines.length - 6} more rows` : "");
  return { result, dataPreview };
}

function ResultView(props: { formula: string }) {
  const [state, setState] = useState<CalcState>({ kind: "loading" });

  useEffect(() => {
    evaluate(props.formula)
      .then(({ result, dataPreview }) =>
        setState({
          kind: "result",
          formula: props.formula,
          result,
          dataPreview,
        }),
      )
      .catch((e: Error) =>
        setState({
          kind: "error",
          message: e instanceof VgridMissingError ? e.message : e.message,
        }),
      );
  }, [props.formula]);

  if (state.kind === "loading")
    return <Detail isLoading markdown="Evaluating…" />;
  if (state.kind === "error")
    return <Detail markdown={`## Couldn't evaluate\n\n${state.message}`} />;

  const md = [
    `# ${state.result}`,
    "",
    `\`${state.formula}\` over clipboard data:`,
    "",
    "```",
    state.dataPreview,
    "```",
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={state.result} />
          <Action.Paste title="Paste Result" content={state.result} />
        </ActionPanel>
      }
    />
  );
}

export default function QuickCalc(
  props: LaunchProps<{ arguments: Arguments.QuickCalc }>,
) {
  const initial = props.arguments.formula?.trim();
  const { push } = useNavigation();
  const [clipInfo, setClipInfo] = useState<string>("Reading clipboard…");

  useEffect(() => {
    Clipboard.readText().then((clip) => {
      const rows = (clip ?? "").trim().split("\n").filter(Boolean);
      if (rows.length === 0) {
        setClipInfo(
          "Clipboard is empty — literal formulas like =SUM(1,2,3) still work; copy data to reference A1, B1, …",
        );
      } else {
        const { data, format } = normalizeClipboard(clip ?? "");
        const cols =
          data.split("\n")[0]?.split(format === "tsv" ? "\t" : ",").length ?? 1;
        const first =
          rows[0].length > 40 ? rows[0].slice(0, 40) + "…" : rows[0];
        setClipInfo(
          `Clipboard data → loaded at A1: ${rows.length} row${rows.length === 1 ? "" : "s"} × ${cols} col${cols === 1 ? "" : "s"} (first: ${first})`,
        );
      }
    });
  }, []);

  // Formula given as a launch argument: evaluate immediately.
  if (initial)
    return (
      <ResultView formula={initial.startsWith("=") ? initial : `=${initial}`} />
    );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Evaluate"
            icon={Icon.Calculator}
            onSubmit={(values: { formula: string }) => {
              const f = values.formula.trim();
              if (f)
                push(<ResultView formula={f.startsWith("=") ? f : `=${f}`} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="formula"
        title="Formula"
        placeholder="=SUM(A1:A10)"
        info="Evaluated against CSV data from your clipboard, loaded at A1."
      />
      <Form.Description title="Data" text={clipInfo} />
      <Form.Description text="Formulas that reference cells (A1, B2:B9) read the clipboard grid; literal formulas like =SUM(1,2,3) don't need it. Fully local, powered by the VisiGrid engine." />
    </Form>
  );
}
