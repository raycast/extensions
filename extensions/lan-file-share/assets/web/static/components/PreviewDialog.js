import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { download, fetchText, fileUrl } from "../api.js";
import { copyText } from "../copy.js";
import { Button } from "./ui/Button.js";
import { Dialog } from "./ui/Dialog.js";

const isTextLike = (kind) => kind === "text" || kind === "markdown";

export function PreviewDialog({ target, onClose, onDownloadError }) {
  const body = useRef(null);
  const [text, setText] = useState(undefined);
  const [error, setError] = useState(undefined);
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    setText(target?.text);
    setError(undefined);
    setCopyState("idle");
    if (!target || target.text !== undefined || target.entryId === undefined || !isTextLike(target.kind))
      return;
    let cancelled = false;
    fetchText(target.entryId, target.path ?? "")
      .then((value) => {
        if (!cancelled) setText(value);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const copy = async () => {
    if (text === undefined) return;
    const result = await copyText(text, body.current);
    setCopyState(result);
    setTimeout(() => setCopyState("idle"), 2500);
  };

  const url = target?.entryId !== undefined ? fileUrl(target.entryId, target.path ?? "", false) : "";
  const loading = isTextLike(target?.kind) && error === undefined && text === undefined;
  const needsFetch = target !== undefined && target.text === undefined && target.entryId !== undefined;

  return html`
    <${Dialog}
      open=${Boolean(target)}
      onOpenChange=${(next) => {
        if (!next) onClose();
      }}
      id="preview-dialog"
      title=${target?.name ?? "Preview"}
      size="wide"
      toolbar=${
        target
          ? html`
              ${isTextLike(target.kind)
                ? html`
                    <${Button}
                      id="preview-copy"
                      size="small"
                      disabled=${text === undefined}
                      onClick=${() => void copy()}
                    >
                      ${copyState === "copied"
                        ? "Copied"
                        : copyState === "selected"
                          ? "Press ⌘C"
                          : "Copy Text"}
                    <//>
                  `
                : null}
              ${target.entryId !== undefined
                ? html`
                    <${Button}
                      id="preview-download"
                      size="small"
                      onClick=${() =>
                        void download(
                          [{ entry: target.entryId ?? "", path: target.path ?? "" }],
                          onDownloadError,
                        )}
                    >
                      Download
                    <//>
                  `
                : null}
            `
          : null
      }
    >
      ${target
        ? html`
            ${copyState === "selected"
              ? html`
                  <p id="copy-hint" role="status" class="mb-2 text-xs text-muted">
                    This address is plain http, so the browser will not copy for us — the text is
                    selected, press ⌘C (or Ctrl+C).
                  </p>
                `
              : null}
            <div id="preview-body" ref=${body} class="themed-scroll max-h-[70vh] overflow-auto">
              ${target.kind === "image"
                ? html`<img
                    src=${url}
                    alt=${target.name}
                    class="mx-auto block max-h-[70vh] w-auto max-w-full rounded-xl"
                  />`
                : null}
              ${target.kind === "pdf"
                ? html`<iframe
                    src=${url}
                    title=${target.name}
                    class="h-[70vh] w-full rounded-lg border-0"
                  ></iframe>`
                : null}
              ${target.kind === "video"
                ? html`
                    <div class="flex justify-center overflow-hidden rounded-2xl bg-black p-1.5">
                      <video
                        src=${url}
                        controls
                        playsinline
                        class="max-h-[66vh] w-full rounded-xl"
                      ></video>
                    </div>
                  `
                : null}
              ${target.kind === "audio"
                ? html`
                    <div class="rounded-2xl border border-line bg-surface p-4">
                      <audio src=${url} controls class="w-full"></audio>
                    </div>
                  `
                : null}
              ${isTextLike(target.kind)
                ? loading && needsFetch
                  ? html`
                      <div role="status" aria-live="polite" class="space-y-2">
                        <span class="sr-only">Loading…</span>
                        <div class="h-4 w-2/3 animate-pulse rounded bg-surface"></div>
                        <div class="h-4 w-1/2 animate-pulse rounded bg-surface"></div>
                        <div class="h-4 w-3/4 animate-pulse rounded bg-surface"></div>
                      </div>
                    `
                  : error !== undefined
                    ? html`<p role="alert" class="text-sm text-danger">${error}</p>`
                    : html`<pre
                        class="rounded-xl bg-surface p-4 text-sm break-words whitespace-pre-wrap"
                      >${text}</pre>`
                : null}
            </div>
          `
        : null}
    <//>
  `;
}
