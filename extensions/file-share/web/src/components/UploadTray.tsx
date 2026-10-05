import { ArrowUp, RotateCw, X } from "lucide-react";
import { formatSize } from "../format";
import { cn } from "../lib/cn";
import { Popover } from "./ui/Popover";
import { IconButton } from "./ui/IconButton";
import { Progress } from "./ui/Progress";

export type Upload = {
  id: string;
  /** Name + size + modification time, the same key the service uses to resume an upload. */
  key: string;
  name: string;
  size: number;
  ratio: number;
  status: string;
  failed: boolean;
};

/**
 * Uploads live behind one icon instead of taking over the list: the badge counts what is still running, and
 * the panel shows progress plus a cancel button. Finished uploads leave the panel, since they are now rows
 * in the list with everyone else.
 */
export function UploadTray({
  uploads,
  onDismiss,
  onRetry,
}: {
  uploads: Upload[];
  onDismiss: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (uploads.length === 0) return null;
  const running = uploads.filter((upload) => !upload.failed).length;
  const failed = uploads.length - running;
  const spinning = running > 0;
  const summary =
    running > 0 ? `${running} in progress` : failed === 1 ? "1 failed" : failed > 0 ? `${failed} failed` : "Nothing in progress";

  return (
    <Popover
      label="Uploads"
      trigger={({ open, toggle }) => (
        <span className="relative inline-flex">
          <button
            type="button"
            id="uploads"
            aria-label={`Uploads: ${summary.toLowerCase()}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={toggle}
            className={cn(
              "relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line transition-colors duration-150 hover:bg-surface sm:size-9",
              failed > 0 && running === 0 ? "text-danger" : "text-accent",
              open && "bg-surface",
            )}
          >
            {/* The ring turns while something is moving; the arrow inside stays put and keeps the accent color. */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0.5 rounded-full border-2 border-accent/25",
                spinning && "animate-spin border-t-accent",
              )}
            />
            <ArrowUp size={15} aria-hidden="true" />
          </button>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-background",
              failed > 0 ? "bg-danger text-background" : "bg-accent text-accent-ink",
            )}
          >
            {uploads.length}
          </span>
        </span>
      )}
    >
      {() => (
        <>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Uploads</p>
          <p className={failed > 0 && running === 0 ? "text-xs text-danger" : "text-xs text-muted"}>{summary}</p>
        </div>
        <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {uploads.map((upload) => (
          <li key={upload.id} className="upload-row rounded-xl border border-line px-3 py-2.5">
            {/* Title and its two actions share one line, with the actions pinned to the right edge. */}
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{upload.name}</p>
              <div className="flex shrink-0 items-center">
                {upload.failed ? (
                  <IconButton
                    id={`retry-${upload.id}`}
                    label={`Retry upload of ${upload.name}`}
                    dense
                    onClick={() => onRetry(upload.id)}
                    className="text-accent hover:text-accent"
                  >
                    <RotateCw size={16} aria-hidden="true" />
                  </IconButton>
                ) : null}
                <IconButton
                  label={upload.failed ? `Dismiss ${upload.name}` : `Cancel upload of ${upload.name}`}
                  dense
                  onClick={() => onDismiss(upload.id)}
                >
                  <X size={16} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
            <p
              className={upload.failed ? "mt-0.5 text-xs text-danger" : "mt-0.5 text-xs text-muted"}
              aria-live="polite"
            >
              {upload.status}
            </p>
            <div className="flex items-center gap-2">
                <Progress
                  ratio={upload.ratio}
                  failed={upload.failed}
                  label={`Uploading ${upload.name}`}
                  className="mt-1.5 flex-1"
                />
                <span className="text-xs text-muted tabular-nums">{formatSize(upload.size)}</span>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </Popover>
  );
}
