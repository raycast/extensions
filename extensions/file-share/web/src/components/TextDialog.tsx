import { useEffect, useRef, useState, type FormEvent } from "react";
import { addText } from "../api";
import { copyText, type CopyResult } from "../copy";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

const MAX_LENGTH = 10000;

/** Text shared from the browser becomes a list entry everyone can see. */
export function TextDialog({
  open,
  onClose,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  onShared?: () => void;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | CopyResult>("idle");
  const area = useRef<HTMLTextAreaElement>(null);

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

  const submit = async (event: FormEvent) => {
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      id="text-dialog"
      title={sent ? "Text Shared" : "Share Text With Everyone"}
    >
      <form id="text-form" onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="text-input" className="sr-only">
            Text
          </label>
          <textarea
            id="text-input"
            ref={area}
            rows={8}
            autoFocus
            maxLength={MAX_LENGTH}
            placeholder="Paste text here"
            value={text}
            readOnly={sent}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "text-error text-count" : "text-count"}
            onChange={(event) => {
              setText(event.target.value);
              setError(undefined);
            }}
            className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-sm text-ink disabled:opacity-70"
          />
          <p id="text-count" className="text-xs text-muted tabular-nums">
            {text.length} / {MAX_LENGTH} characters
          </p>
        </div>
        {error ? (
          <p id="text-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          {sent ? (
            <Button id="text-copy" onClick={() => void copy()}>
              {copyState === "copied" ? "Copied" : "Copy Text"}
            </Button>
          ) : null}
          {sent ? null : (
            <>
              <Button id="text-cancel" onClick={onClose}>
                Cancel
              </Button>
              <Button id="text-submit" type="submit" variant="primary" disabled={busy}>
                {busy ? "Sharing…" : "Share"}
              </Button>
            </>
          )}
        </div>
        {copyState === "selected" ? (
          <p role="status" className="text-right text-xs text-muted">
            This address is plain http, so the browser will not copy for us — press ⌘C (or Ctrl+C).
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
