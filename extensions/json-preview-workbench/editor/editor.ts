import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldAll,
  unfoldAll,
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { json } from "@codemirror/lang-json";
import { tags } from "@lezer/highlight";
import { Document, JsonValue, formatJson, parseInput, sortKeys, toTypeScript, toXml, toYaml } from "../src/lib/json";
import { transform } from "../src/lib/query";

declare global {
  interface Window {
    webkit?: { messageHandlers: { native: { postMessage(value: unknown): void } } };
    receiveNative: (value: {
      action: string;
      text?: string;
      name?: string;
      message?: string;
      indent?: number;
      value?: boolean;
    }) => void;
  }
}

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const expression = element<HTMLInputElement>("expression");
const outputFormat = element<HTMLSelectElement>("output-format");
const indentSelect = element<HTMLSelectElement>("indent");
const status = element<HTMLDivElement>("status");
let current: Document | undefined;
let result: JsonValue | undefined;
let output = "";
let sorted = false;
let baseline = "";
let sequence = 0;
let timer: ReturnType<typeof setTimeout>;

const colors = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--json-key)" },
  { tag: tags.string, color: "var(--json-string)" },
  { tag: tags.number, color: "var(--json-number)" },
  { tag: tags.bool, color: "var(--json-keyword)" },
  { tag: tags.null, color: "var(--json-keyword)" },
  { tag: tags.punctuation, color: "#85909e" },
]);
const common = [
  lineNumbers(),
  foldGutter(),
  bracketMatching(),
  drawSelection(),
  highlightSelectionMatches(),
  syntaxHighlighting(colors),
  json(),
  EditorView.theme({
    "&": { backgroundColor: "var(--bg)", color: "var(--text)" },
    ".cm-selectionBackground": { backgroundColor: "var(--selection) !important" },
  }),
  keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
];
const source = new EditorView({
  parent: element("source"),
  state: EditorState.create({
    doc: "",
    extensions: [
      ...common,
      history(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      indentOnInput(),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        send({ action: "dirty", value: source.state.doc.toString() !== baseline });
        if (update.transactions.some((transaction) => transaction.isUserEvent("input.paste"))) {
          queueMicrotask(() => autoFormatSource());
        }
        schedule();
      }),
    ],
  }),
});
const preview = new EditorView({
  parent: element("result"),
  state: EditorState.create({ extensions: [...common, EditorState.readOnly.of(true), EditorView.editable.of(false)] }),
});

function send(value: Record<string, unknown>) {
  window.webkit?.messageHandlers.native.postMessage(value);
}
function message(text: string, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}
function replace(view: EditorView, text: string) {
  if (view.state.doc.toString() !== text)
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}
function renderOutput() {
  if (result === undefined) return;
  const value = sorted ? sortKeys(result) : result;
  switch (outputFormat.value) {
    case "yaml":
      output = toYaml(value);
      break;
    case "xml":
      output = toXml(value);
      break;
    case "typescript":
      output = toTypeScript(value);
      break;
    case "escaped":
      output = JSON.stringify(formatJson(value, 0));
      break;
    default:
      output = formatJson(value, Number(indentSelect.value));
  }
  replace(preview, output);
  element("result-info").textContent =
    `${output.split("\n").length.toLocaleString()} lines · ${new TextEncoder().encode(output).length.toLocaleString()} bytes`;
  element<HTMLButtonElement>("copy").disabled = false;
  element<HTMLButtonElement>("save").disabled = false;
  element<HTMLButtonElement>("compact").disabled = false;
  element<HTMLButtonElement>("escaped-copy").disabled = false;
}
function updateLayout() {
  const filtered = expression.value.trim() !== "" && expression.value.trim() !== "this";
  const main = document.querySelector("main")!;
  main.classList.toggle("single", !filtered);
  main.classList.toggle("converted", outputFormat.value !== "json");
  element("copy").textContent = filtered ? "Copy Result" : "Copy";
  element("save").textContent = filtered ? "Save Result" : "Save";
  element("result-format").textContent = outputFormat.options[outputFormat.selectedIndex].text;
  source.requestMeasure();
  preview.requestMeasure();
}
function autoFormatSource() {
  try {
    const value = parseInput(source.state.doc.toString()).value;
    replace(source, formatJson(sorted ? sortKeys(value) : value, Number(indentSelect.value)));
  } catch {
    // Keep incomplete input intact so the user can repair it in place.
  }
}
async function refresh() {
  const token = ++sequence;
  updateLayout();
  try {
    const text = source.state.doc.toString();
    if (!text.trim()) {
      current = undefined;
      result = undefined;
      output = "";
      replace(preview, "");
      element<HTMLButtonElement>("copy").disabled = true;
      element<HTMLButtonElement>("save").disabled = true;
      element<HTMLButtonElement>("compact").disabled = true;
      element<HTMLButtonElement>("escaped-copy").disabled = true;
      message("Paste JSON or open a file to start.");
      return;
    }
    current = parseInput(text);
    element("input-format").textContent = current.format;
    message(expression.value.trim() ? "Running expression…" : "Formatting…");
    const next = await transform(current.value, expression.value);
    if (token !== sequence) return;
    result = next;
    renderOutput();
    message(
      `${current.format} → ${outputFormat.options[outputFormat.selectedIndex].text}  ·  ${expression.value.trim() ? "Expression evaluated" : "Valid input"}`,
    );
  } catch (error) {
    if (token !== sequence) return;
    result = undefined;
    output = "";
    replace(preview, "");
    element<HTMLButtonElement>("copy").disabled = true;
    element<HTMLButtonElement>("save").disabled = true;
    element<HTMLButtonElement>("compact").disabled = true;
    element<HTMLButtonElement>("escaped-copy").disabled = true;
    message(error instanceof Error ? error.message : String(error), true);
  }
}
function schedule() {
  clearTimeout(timer);
  sequence++;
  element<HTMLButtonElement>("copy").disabled = true;
  element<HTMLButtonElement>("save").disabled = true;
  element<HTMLButtonElement>("compact").disabled = true;
  element<HTMLButtonElement>("escaped-copy").disabled = true;
  updateLayout();
  timer = setTimeout(refresh, 300);
}
function guarded(action: () => void) {
  try {
    action();
  } catch (error) {
    message(error instanceof Error ? error.message : String(error), true);
  }
}
function replaceInput(text: string, name: string, force: boolean) {
  if (
    !force &&
    source.state.doc.toString() !== baseline &&
    !confirm("Replace the current input? Unsaved edits will be lost.")
  )
    return;
  try {
    text = formatJson(parseInput(text).value, Number(indentSelect.value));
  } catch {
    /* Keep invalid input editable. */
  }
  baseline = text;
  replace(source, text);
  element("input-name").textContent = name;
  void refresh();
}
window.receiveNative = (payload) => {
  if (payload.indent) indentSelect.value = String(payload.indent);
  if (["load", "open", "paste"].includes(payload.action))
    replaceInput(payload.text ?? "", payload.name ?? "Text", payload.action === "load");
  else if (payload.action === "error") message(payload.message ?? "Operation Failed", true);
  else if (payload.action === "notice") message(payload.message ?? "Done");
  else if (payload.action === "pin") {
    element("pin").setAttribute("aria-pressed", String(Boolean(payload.value)));
    element("pin").textContent = payload.value ? "Pinned" : "Pin";
  }
};
element("pin").onclick = () => send({ action: "pin", value: element("pin").getAttribute("aria-pressed") !== "true" });
expression.addEventListener("input", schedule);
element("run").onclick = () => void refresh();
element("open").onclick = () => send({ action: "open" });
element("paste").onclick = () => send({ action: "paste" });
element("copy").onclick = () => {
  if (result !== undefined) {
    if (outputFormat.value === "json") {
      send({ action: "copy", text: formatJson(sorted ? sortKeys(result) : result, Number(indentSelect.value)) });
    } else send({ action: "copy", text: output });
  }
};
element("save").onclick = () => {
  if (result !== undefined)
    send({
      action: "save",
      text: output,
      filename: `result.${outputFormat.value === "typescript" ? "ts" : outputFormat.value === "escaped" ? "json" : outputFormat.value}`,
    });
};
element("format").onclick = () =>
  guarded(() => {
    replace(source, formatJson(parseInput(source.state.doc.toString()).value, Number(indentSelect.value)));
  });
element("fold").onclick = () => {
  foldAll(source);
  foldAll(preview);
};
element("unfold").onclick = () => {
  unfoldAll(source);
  unfoldAll(preview);
};
element("compact").onclick = () => {
  if (result !== undefined) send({ action: "copy", text: formatJson(sorted ? sortKeys(result) : result, 0) });
};
element("escaped-copy").onclick = () => {
  if (result !== undefined)
    send({ action: "copy", text: JSON.stringify(formatJson(sorted ? sortKeys(result) : result, 0)).slice(1, -1) });
};
element("sort").onclick = () => {
  sorted = !sorted;
  element("sort").style.color = sorted ? "var(--accent)" : "";
  if (!expression.value.trim() || expression.value.trim() === "this") autoFormatSource();
  guarded(renderOutput);
};
outputFormat.onchange = () => {
  updateLayout();
  void refresh();
};
indentSelect.onchange = () => {
  autoFormatSource();
  guarded(renderOutput);
};
document.addEventListener("keydown", (event) => {
  if (event.altKey && !event.metaKey && !event.ctrlKey) {
    const key = event.key.toLowerCase();
    const id =
      event.code === "KeyC"
        ? "compact"
        : event.code === "KeyF"
          ? "format"
          : event.code === "Backslash"
            ? "escaped-copy"
            : key === ">"
              ? event.shiftKey
                ? "unfold"
                : "fold"
              : "";
    if (id) {
      event.preventDefault();
      element(id).click();
      return;
    }
  }
  if (!event.metaKey) return;
  const key = event.key.toLowerCase();
  const id =
    key === "o"
      ? "open"
      : key === "s"
        ? "save"
        : key === "enter"
          ? "run"
          : event.shiftKey && key === "c"
            ? "copy"
            : event.shiftKey && key === "v"
              ? "paste"
              : event.shiftKey && key === "f"
                ? "format"
                : "";
  if (id) {
    event.preventDefault();
    element(id).click();
  }
});
const divider = element("divider");
const main = document.querySelector("main")!;
function split(percent: number) {
  main.style.gridTemplateColumns = `minmax(0, ${percent}fr) 7px minmax(0, ${100 - percent}fr)`;
}
divider.addEventListener("pointerdown", (event) => {
  divider.setPointerCapture(event.pointerId);
  const move = (e: PointerEvent) => split(Math.min(80, Math.max(20, (e.clientX / main.clientWidth) * 100)));
  divider.addEventListener("pointermove", move);
  divider.addEventListener("pointerup", () => divider.removeEventListener("pointermove", move), { once: true });
});
divider.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") split(40);
  if (event.key === "ArrowRight") split(60);
});
element<HTMLButtonElement>("copy").disabled = true;
element<HTMLButtonElement>("save").disabled = true;
element<HTMLButtonElement>("compact").disabled = true;
element<HTMLButtonElement>("escaped-copy").disabled = true;
updateLayout();
send({ action: "ready" });
