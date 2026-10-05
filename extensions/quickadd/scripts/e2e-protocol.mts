import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import {
  type FieldSpec,
  fieldSpecFromForm,
  fieldSpecFromPrompt,
  readField,
} from "../src/lib/fields.ts";
import type { PromptSpec, SessionEvent } from "../src/lib/interactive.ts";

const VAULT = "e2e-vault";
const VAULT_DIR = new URL("../e2e-vault/", import.meta.url);
const CLI = process.env.OBSIDIAN_CLI ?? "/opt/homebrew/bin/obsidian";
const PICKED_DATE = new Date(2026, 9, 5, 14, 30);

function obsidian(...args: string[]): string {
  return execFileSync(CLI, [`vault=${VAULT}`, ...args], { encoding: "utf8" });
}

function userInput(spec: FieldSpec): { raw: unknown; custom?: string } {
  switch (spec.kind) {
    case "text":
      return { raw: `${spec.label} answer` };
    case "number":
      return { raw: "3" };
    case "date":
      return { raw: PICKED_DATE };
    case "select":
      if (spec.notePicker) {
        const target =
          spec.options.find((o) => o.value === "Output/Picked.md") ??
          spec.options.find((o) => o.value.endsWith("People/Ada Lovelace.md"));
        return { raw: target?.value ?? "" };
      }
      return {
        raw: spec.options[1].value,
        custom: spec.allowCustom ? "typed" : undefined,
      };
    case "multi":
      return {
        raw: [spec.options[0].value, spec.options[2]?.value].filter(Boolean),
        custom: spec.allowCustom ? "extra, more" : undefined,
      };
  }
}

function answerField(spec: FieldSpec): string | string[] {
  const { raw, custom } = userInput(spec);
  const read = readField(spec, raw, custom);
  if (!read.ok) throw new Error(`${spec.label}: ${read.error}`);
  return read.value;
}

function reply(prompt: PromptSpec): unknown {
  switch (prompt.type) {
    case "form":
      return Object.fromEntries(
        prompt.fields.map((field) => {
          const spec = fieldSpecFromForm(field);
          return [spec.id, answerField(spec)];
        }),
      );
    case "input":
    case "date":
    case "multiselect":
      return answerField(fieldSpecFromPrompt(prompt));
    case "suggester":
      return prompt.allowCustomInput ? "typed" : prompt.items[0].value;
    case "checkbox":
      return prompt.items.filter((item) => !item.checked).map((i) => i.value);
    case "confirm":
    case "info":
      return true;
  }
}

async function start(choiceId: string, vars?: object) {
  const started = JSON.parse(
    obsidian(
      "quickadd:interactive",
      `id=${choiceId}`,
      ...(vars ? [`vars=${JSON.stringify(vars)}`] : []),
    ),
  );
  if (!started.ok) throw new Error(started.error);
  return (path: string) =>
    `http://${started.host}:${started.port}${path}?session=${started.sessionId}&token=${started.token}`;
}

async function nextEvent(at: (path: string) => string): Promise<SessionEvent> {
  for (;;) {
    const event = (await (await fetch(at("/poll"))).json()) as SessionEvent;
    if (event.kind !== "idle") return event;
  }
}

async function run(choiceId: string, vars?: object) {
  const at = await start(choiceId, vars);
  for (;;) {
    const event = await nextEvent(at);
    if (event.kind === "error") throw new Error(event.error);
    if (event.kind === "done") return { result: event.result, at };
    if (event.kind !== "prompt") continue;
    const value = reply(event.prompt);
    console.log(`  ${event.prompt.type} -> ${JSON.stringify(value)}`);
    const res = await fetch(at("/reply"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId: event.requestId, value }),
    });
    if (!res.ok) throw new Error(`reply rejected: ${await res.text()}`);
  }
}

function note(path: string): string {
  return readFileSync(new URL(path, VAULT_DIR), "utf8");
}

// What a Quicklink argument carries into the run as `value`.
const ARGUMENT = `idea & plan #tag [[Note]] "quoted" back\\slash æøå 💡`;

const cases: Array<
  [id: string, path: string, expected: string[], vars?: object]
> = [
  ["e2e-text", "Output/Inbox.md", ["- text: Text to capture answer"]],
  [
    "e2e-text",
    "Output/Inbox.md",
    [`- text: ${ARGUMENT}\n`],
    { value: ARGUMENT },
  ],
  ["e2e-select", "Output/Inbox.md", ["- color: green"]],
  ["e2e-multi", "Output/Inbox.md", ["- tags: alpha,gamma"]],
  ["e2e-custom", "Output/Inbox.md", ["- mood: typed"]],
  ["e2e-number", "Output/Inbox.md", ["- rating: 3"]],
  ["e2e-date", "Output/Inbox.md", ["- due: 2026-10-05 14:30"]],
  ["e2e-picker", "Output/Picked.md", ["- picked: Text to capture answer"]],
  [
    "e2e-runtime",
    "Output/Inbox.md",
    ["- runtime: note answer | alpha,gamma | 2026-10-05"],
  ],
  ["e2e-template", "Output/name answer.md", ["Friend: Ada Lovelace"]],
  [
    "e2e-macro",
    "Output/Script output.md",
    [
      '"input": "Title answer"',
      '"wide": "Body answer"',
      '"suggester": "typed"',
      '"checkbox": [\n    "x",\n    "z"\n  ]',
      '"date": "2026-10-05"',
      '"confirm": true',
      '"effort": "3"',
      '"confidence": "3"',
      '"status": "Doing"',
      '"labels": "work, extra, more"',
      '"start": "2026-10-05"',
    ],
  ],
];

obsidian(
  "eval",
  `code=void (async () => {
    const out = app.vault.getAbstractFileByPath("Output");
    if (out) await app.vault.delete(out, true);
    await app.vault.createFolder("Output");
    await app.vault.create("Output/Picked.md", "# Picked\\n");
  })()`,
);
await sleep(1500);

let failed = 0;
for (const [id, path, expected, vars] of cases) {
  console.log(vars ? `${id} with vars` : id);
  try {
    const { result } = await run(id, vars);
    await sleep(300);
    const content = note(path);
    const missing = expected.filter((text) => !content.includes(text));
    if (missing.length > 0) {
      throw new Error(
        `${path} lacks ${JSON.stringify(missing)}:\n${content.trim()}`,
      );
    }
    console.log(`  ok (${result.file ?? path})`);
  } catch (error) {
    failed++;
    console.log(`  FAIL ${error instanceof Error ? error.message : error}`);
  }
}
const aborts: Array<[name: string, check: () => Promise<void>]> = [
  [
    "abort while the run is mid-work",
    async () => {
      const at = await start("e2e-slow");
      const abort = await fetch(at("/abort"), { method: "POST" });
      const body = await abort.json();
      if (!body.ok || body.interrupted !== 0) {
        throw new Error(`abort answered ${JSON.stringify(body)}`);
      }
      const event = await nextEvent(at);
      if (event.kind !== "error") {
        throw new Error(`run was not aborted: ${JSON.stringify(event)}`);
      }
      await sleep(300);
      const marker = note("Output/Slow aborted.md");
      if (!marker.includes("Input cancelled by user")) {
        throw new Error(`the prompt was not cancelled: ${marker.trim()}`);
      }
      if (existsSync(new URL("Output/Slow.md", VAULT_DIR))) {
        throw new Error("the aborted run still wrote Output/Slow.md");
      }
    },
  ],
  [
    "abort after the run is done",
    async () => {
      const { at } = await run("e2e-text");
      const abort = await fetch(at("/abort"), { method: "POST" });
      const body = await abort.json();
      if (abort.status !== 409 || body.ok !== false) {
        throw new Error(
          `abort answered ${abort.status} ${JSON.stringify(body)}`,
        );
      }
    },
  ],
];
for (const [name, check] of aborts) {
  console.log(name);
  try {
    await check();
    console.log("  ok");
  } catch (error) {
    failed++;
    console.log(`  FAIL ${error instanceof Error ? error.message : error}`);
  }
}

const total = cases.length + aborts.length;
console.log(failed ? `${failed} of ${total} failed` : `all ${total} passed`);
process.exit(failed ? 1 : 0);
