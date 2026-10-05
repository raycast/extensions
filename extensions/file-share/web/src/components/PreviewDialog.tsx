import { useCallback, useEffect, useRef, useState } from "react";
import { download, fetchText, fileUrl } from "../api";
import { copyText, type CopyResult } from "../copy";
import type { PreviewKind } from "../format";
import { Markdown } from "./Markdown";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

export type PreviewTarget = {
  name: string;
  kind: PreviewKind | "text";
  /** Known body, used for text entries that came from the list. */
  text?: string;
  /** Entry and path, used to fetch or stream file contents. */
  entryId?: string;
  path?: string;
};

const isTextLike = (kind: PreviewTarget["kind"] | undefined) => kind === "text" || kind === "markdown";

export function PreviewDialog({
  target,
  onClose,
  onDownloadError,
}: {
  target?: PreviewTarget;
  onClose: () => void;
  onDownloadError?: (message: string) => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string>();
  const [error, setError] = useState<string>();
  const [copyState, setCopyState] = useState<"idle" | CopyResult>("idle");

  useEffect(() => {
    setText(target?.text);
    setError(undefined);
    setCopyState("idle");
    if (!target || target.text !== undefined || target.entryId === undefined || !isTextLike(target.kind)) return;
    let cancelled = false;
    fetchText(target.entryId, target.path ?? "")
      .then((value) => {
        if (!cancelled) setText(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const copy = async () => {
    const result = await copyText(text ?? "", body.current);
    setCopyState(result);
    setTimeout(() => setCopyState("idle"), 2500);
  };

  /**
   * A markdown file opened while browsing a folder may point at a sibling image; those are inside the same
   * entry, so they get an API URL. A list entry that is a file has no directory to pull siblings from — the
   * service only serves what the list holds — so those keep their original source.
   */
  const entryId = target?.entryId;
  const browsedPath = target?.path !== undefined && target.path !== "" ? target.path : undefined;
  const directory = browsedPath !== undefined ? browsedPath.split("/").slice(0, -1).join("/") : undefined;
  const resolveImage = useCallback(
    (source: string) => {
      if (entryId === undefined || directory === undefined) return undefined;
      if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith("//")) return undefined;
      if (source.startsWith("/") || source.startsWith("#")) return undefined;
      const relative = source.split(/[?#]/)[0].replace(/^\.\//, "");
      if (relative === "") return undefined;
      return fileUrl(entryId, directory === "" ? relative : `${directory}/${relative}`, false);
    },
    [directory, entryId],
  );

  const url = target?.entryId !== undefined ? fileUrl(target.entryId, target.path ?? "", false) : "";
  const loading = isTextLike(target?.kind) && error === undefined && text === undefined;
  const needsFetch = target !== undefined && target.text === undefined && target.entryId !== undefined;

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      id="preview-dialog"
      title={target?.name ?? "Preview"}
      className="w-[min(60rem,calc(100%-2rem))]"
      toolbar={
        target ? (
          <>
            {isTextLike(target.kind) ? (
              <Button id="preview-copy" size="small" onClick={() => void copy()}>
                {copyState === "copied" ? "Copied" : "Copy Text"}
              </Button>
            ) : null}
            {target.entryId !== undefined ? (
              <Button
                id="preview-download"
                size="small"
                onClick={() => void download([{ entry: target.entryId ?? "", path: target.path ?? "" }], onDownloadError)}
              >
                Download
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {target ? (
        <>
          {copyState === "selected" ? (
            <p id="copy-hint" role="status" className="mb-2 text-xs text-muted">
              This address is plain http, so the browser will not copy for us — the text is selected, press ⌘C
              (or Ctrl+C).
            </p>
          ) : null}
          <div id="preview-body" ref={body} className="themed-scroll max-h-[70vh] overflow-auto">
          {target.kind === "image" ? (
            <img src={url} alt={target.name} className="mx-auto block max-h-[70vh] w-auto max-w-full rounded-xl" />
          ) : null}
          {target.kind === "pdf" ? (
            <iframe src={url} title={target.name} className="h-[70vh] w-full rounded-lg border-0" />
          ) : null}
          {/* Native controls cannot be restyled, so the video gets a dark letterbox shell of our own. */}
          {target.kind === "video" ? (
            <div className="flex justify-center overflow-hidden rounded-2xl bg-black p-1.5">
              <video src={url} controls playsInline className="max-h-[66vh] w-full rounded-xl" />
            </div>
          ) : null}
          {target.kind === "audio" ? (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <audio src={url} controls className="w-full" />
            </div>
          ) : null}
          {isTextLike(target.kind) ? (
            loading && needsFetch ? (
              <div role="status" aria-live="polite" className="space-y-2">
                <span className="sr-only">Loading…</span>
                <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-surface" />
              </div>
            ) : error !== undefined ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : target.kind === "markdown" ? (
              <Markdown source={text ?? ""} resolveImage={resolveImage} />
            ) : (
              <pre className="rounded-xl bg-surface p-4 text-sm break-words whitespace-pre-wrap">{text}</pre>
            )
          ) : null}
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
