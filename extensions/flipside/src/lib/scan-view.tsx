import { Action, ActionPanel, Detail, Form, Icon, Toast, open, popToRoot, showHUD, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { writeFile } from "fs/promises";
import { join } from "path";
import { type AdfState, type Scanner, discoverScanner, getAdfState, scanPass } from "./escl";
import { collateDuplex, singleSidedPdf } from "./pdf";
import { type FlipsidePreferences, debug, defaultSaveDir, delay, getPrefs, scanOptions, timestampName } from "./util";

type Sides = "duplex" | "simplex";

type Phase =
  | "preparing"
  | "awaiting-load"
  | "scanning-fronts"
  | "awaiting-flip"
  | "scanning-backs"
  | "assembling"
  | "ready"
  | "error";

interface ScanResult {
  bytes: Uint8Array;
  pageCount: number;
}

const POLL_INTERVAL_MS = 1000;

export function ScanView({ sides }: { sides: Sides }) {
  const prefs = getPrefs();
  const [phase, setPhase] = useState<Phase>("preparing");
  const [detail, setDetail] = useState("Preparing…");
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ScanResult>();
  const abortRef = useRef<AbortController | null>(null);
  const proceedRef = useRef(false);

  useEffect(() => {
    // Create a fresh controller per effect run. React StrictMode mounts the
    // effect twice in dev (run → cleanup/abort → run); a single shared
    // controller would leave the second run with an already-aborted signal.
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    run(ctrl.signal).catch((e: unknown) => {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    });
    return () => ctrl.abort();
  }, []);

  // Poll the ADF until it reaches `target`, or the user clicks "Continue Now".
  async function waitForAdf(scanner: Scanner, target: AdfState, signal: AbortSignal) {
    proceedRef.current = false;
    let unreachable = 0;
    for (;;) {
      if (signal.aborted) throw new Error("Cancelled.");
      if (proceedRef.current) {
        proceedRef.current = false;
        return;
      }
      const state = await getAdfState(scanner, signal);
      if (state === target) return;
      if (state === "unknown") {
        if (++unreachable >= 8) {
          throw new Error(
            `Can't reach the scanner at ${scanner.base}. Check the Scanner Host preference and your network.`,
          );
        }
      } else {
        unreachable = 0;
      }
      await delay(POLL_INTERVAL_MS, signal);
    }
  }

  async function run(signal: AbortSignal) {
    const opts = scanOptions(prefs);
    const dpi = opts.resolution;
    debug(`run: sides=${sides}, opts=`, opts, "prefs.scannerHost=", JSON.stringify(prefs.scannerHost));

    setDetail("Finding scanner…");
    const toast = await showToast({ style: Toast.Style.Animated, title: "Finding scanner…" });
    const scanner = await discoverScanner(prefs.scannerHost, signal);

    // Pass 1 — fronts
    const initialState = await getAdfState(scanner, signal);
    debug(`run: initial ADF state = ${initialState}`);
    if (initialState !== "loaded") {
      setPhase("awaiting-load");
      setDetail("Load the document into the ADF, face up, and it will start automatically.");
      toast.title = "Waiting for paper…";
      await waitForAdf(scanner, "loaded", signal);
    }
    setPhase("scanning-fronts");
    const frontNoun = sides === "duplex" ? "front side" : "page";
    setDetail(`Scanning… the first page can take ~10 seconds.`);
    toast.title = "Scanning…";
    const fronts = await scanPass(scanner, opts, signal, (n) => {
      setDetail(`Scanned ${n} ${frontNoun}${n === 1 ? "" : "s"}… (keep the rest feeding)`);
      toast.title = `Scanned ${n} ${frontNoun}${n === 1 ? "" : "s"}…`;
    });
    if (fronts.length === 0) throw new Error("No pages were scanned. Is the ADF loaded?");

    if (sides === "simplex") {
      setPhase("assembling");
      setDetail("Building PDF…");
      toast.title = "Building PDF…";
      const bytes = await singleSidedPdf(fronts, dpi);
      await toast.hide();
      setResult({ bytes, pageCount: fronts.length });
      setPhase("ready");
      return;
    }

    // Pass 2 — backs
    setPhase("awaiting-flip");
    setDetail("Flip the stack **left-to-right** (like turning a page) and reload it. Scanning resumes automatically.");
    toast.title = "Flip the stack and reload";
    await waitForAdf(scanner, "loaded", signal);
    setPhase("scanning-backs");
    setDetail(`Scanning… the first page can take ~10 seconds.`);
    toast.title = "Scanning…";
    const backs = await scanPass(scanner, opts, signal, (n) => {
      setDetail(`Scanned ${n} back side${n === 1 ? "" : "s"}…`);
      toast.title = `Scanned ${n} back side${n === 1 ? "" : "s"}…`;
    });
    if (backs.length === 0) throw new Error("No back pages were scanned.");

    setPhase("assembling");
    setDetail("Collating pages…");
    toast.title = "Building PDF…";
    const bytes = await collateDuplex(fronts, backs, dpi);
    await toast.hide();
    setResult({ bytes, pageCount: fronts.length + backs.length });
    setPhase("ready");
  }

  if (phase === "ready" && result) {
    return <SaveForm result={result} prefs={prefs} />;
  }

  if (phase === "error") {
    return (
      <Detail
        markdown={`# Scan failed\n\n${error ?? "Unknown error."}`}
        actions={
          <ActionPanel>
            <Action title="Close" icon={Icon.Xmark} onAction={popToRoot} />
          </ActionPanel>
        }
      />
    );
  }

  const busy =
    phase === "preparing" || phase === "scanning-fronts" || phase === "scanning-backs" || phase === "assembling";
  const waiting = phase === "awaiting-load" || phase === "awaiting-flip";

  return (
    <Detail
      isLoading={busy}
      markdown={statusMarkdown(sides, phase, detail)}
      actions={
        <ActionPanel>
          {waiting && (
            <Action
              title="Continue Now"
              icon={Icon.ArrowRight}
              onAction={() => {
                proceedRef.current = true;
              }}
            />
          )}
          <Action
            title="Cancel"
            icon={Icon.Xmark}
            style={Action.Style.Destructive}
            onAction={() => {
              abortRef.current?.abort();
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function SaveForm({ result, prefs }: { result: ScanResult; prefs: FlipsidePreferences }) {
  const dir = defaultSaveDir(prefs);
  const [filename, setFilename] = useState(timestampName());

  async function onSubmit(values: { directory?: string[]; filename: string }) {
    try {
      const folder = values.directory?.[0] ?? dir;
      let name = values.filename.trim() || timestampName();
      if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";
      const path = join(folder, name);
      await writeFile(path, result.bytes);
      if (prefs.openAfterSave) await open(path);
      await showHUD(`Saved ${result.pageCount}-page PDF`);
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save PDF",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save PDF" icon={Icon.Download} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Scanned"
        text={`${result.pageCount} page${result.pageCount === 1 ? "" : "s"} ready to save.`}
      />
      <Form.TextField id="filename" title="File Name" value={filename} onChange={setFilename} />
      <Form.FilePicker
        id="directory"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={[dir]}
      />
    </Form>
  );
}

function statusMarkdown(sides: Sides, phase: Phase, detail: string): string {
  const title = sides === "duplex" ? "Flipside — Two-Sided Scan" : "Flipside — One-Sided Scan";
  const steps =
    sides === "duplex"
      ? ["Scan front sides", "Flip the stack & reload", "Scan back sides", "Save"]
      : ["Scan pages", "Save"];

  const activeIndex: Record<Phase, number> = {
    preparing: -1,
    "awaiting-load": 0,
    "scanning-fronts": 0,
    "awaiting-flip": 1,
    "scanning-backs": 2,
    assembling: sides === "duplex" ? 3 : 1,
    ready: sides === "duplex" ? 3 : 1,
    error: -1,
  };
  const active = activeIndex[phase];

  const list = steps
    .map((s, i) => {
      const mark = i < active ? "✅" : i === active ? "▶️" : "⬜️";
      const label = i === active ? `**${s}**` : s;
      return `${mark}  ${label}`;
    })
    .join("\n\n");

  return `# ${title}\n\n${detail}\n\n---\n\n${list}`;
}
