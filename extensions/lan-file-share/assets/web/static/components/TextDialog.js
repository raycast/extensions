import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { addText } from "../api.js";
import { copyText } from "../copy.js";
import { Button } from "./ui/Button.js";
import { Dialog } from "./ui/Dialog.js";

const MAX_LENGTH = 10000;

export function TextDialog({ open, onClose, onShared }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("idle");
  const area = useRef(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setSent(false);
    setError(undefined);
    setBusy(false);
    setCopyState("idle");
  }, [open]);

  const copy = async () => {
    const result = await copyText(text, area.current);
    setCopyState(result);
    setTimeout(() => setCopyState("idle"), 2500);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (text.trim() === "") {
      setError("Type something first — empty text cannot be shared.");
      return;
    }
    setBusy(true);
    try {
      await addText(text);
      setSent(true);
      setError(undefined);
      onShared?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  return html`
    <${Dialog}
      open=${open}
      onOpenChange=${(next) => {
        if (!next) onClose();
      }}
      id="text-dialog"
      title=${sent ? "Text Shared" : "Share Text With Everyone"}
    >
      <form id="text-form" onSubmit=${(event) => void submit(event)} class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <label for="text-input" class="sr-only">Text</label>
          <textarea
            id="text-input"
            ref=${area}
            rows=${8}
            autofocus
            maxlength=${MAX_LENGTH}
            placeholder="Paste text here"
            value=${text}
            readonly=${sent}
            aria-invalid=${Boolean(error)}
            aria-describedby=${error ? "text-error text-count" : "text-count"}
            onInput=${(event) => {
              setText(event.target.value);
              setError(undefined);
            }}
            class="w-full resize-y rounded-xl border border-line bg-surface p-3 text-sm text-ink disabled:opacity-70"
          ></textarea>
          <p id="text-count" class="text-xs text-muted tabular-nums">
            ${text.length} / ${MAX_LENGTH} characters
          </p>
        </div>
        ${error
          ? html`<p id="text-error" role="alert" class="text-sm text-danger">${error}</p>`
          : null}
        <div class="flex flex-wrap justify-end gap-2">
          ${sent
            ? html`
                <${Button} id="text-copy" onClick=${() => void copy()}>
                  ${copyState === "copied"
                    ? "Copied"
                    : copyState === "selected"
                      ? "Press ⌘C"
                      : "Copy Text"}
                <//>
              `
            : html`
                <${Button} id="text-cancel" onClick=${onClose}>Cancel<//>
                <${Button} id="text-submit" type="submit" variant="primary" disabled=${busy}>
                  ${busy ? "Sharing…" : "Share"}
                <//>
              `}
        </div>
        ${copyState === "selected"
          ? html`
              <p role="status" class="text-right text-xs text-muted">
                This address is plain http, so the browser will not copy for us — press ⌘C (or
                Ctrl+C).
              </p>
            `
          : null}
      </form>
    <//>
  `;
}
