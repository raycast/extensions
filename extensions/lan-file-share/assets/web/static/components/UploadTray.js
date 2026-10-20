import { html } from "htm/preact";
import { formatSize } from "../format.js";
import { cn } from "../cn.js";
import { ArrowUp, RotateCw, X } from "../icons.js";
import { Popover } from "./ui/Popover.js";
import { IconButton } from "./ui/IconButton.js";
import { Progress } from "./ui/Progress.js";

export function UploadTray({ uploads, onDismiss, onRetry }) {
  if (uploads.length === 0) return null;
  const running = uploads.filter((upload) => !upload.failed).length;
  const failed = uploads.length - running;
  const spinning = running > 0;
  const summary =
    running > 0
      ? `${running} in progress`
      : failed === 1
        ? "1 failed"
        : failed > 0
          ? `${failed} failed`
          : "Nothing in progress";

  return html`
    <${Popover}
      label="Uploads"
      trigger=${({ open, toggle }) => html`
        <span class="relative inline-flex">
          <button
            type="button"
            id="uploads"
            aria-label=${`Uploads: ${summary.toLowerCase()}`}
            aria-haspopup="dialog"
            aria-expanded=${open}
            onClick=${toggle}
            class=${cn(
              "relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full border border-line transition-colors duration-150 hover:bg-surface sm:size-9",
              failed > 0 && running === 0 ? "text-danger" : "text-accent",
              open && "bg-surface",
            )}
          >
            <span
              aria-hidden="true"
              class=${cn(
                "pointer-events-none absolute inset-0.5 rounded-full border-2 border-accent/25",
                spinning && "animate-spin border-t-accent",
              )}
            ></span>
            <${ArrowUp} size=${15} aria-hidden="true" />
          </button>
          <span
            aria-hidden="true"
            class=${cn(
              "pointer-events-none absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-background",
              failed > 0 ? "bg-danger text-background" : "bg-accent text-accent-ink",
            )}
          >
            ${uploads.length}
          </span>
        </span>
      `}
    >
      ${() => html`
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold">Uploads</p>
          <p class=${failed > 0 && running === 0 ? "text-xs text-danger" : "text-xs text-muted"}>
            ${summary}
          </p>
        </div>
        <ul class="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          ${uploads.map(
            (upload) => html`
              <li key=${upload.id} class="upload-row rounded-xl border border-line px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <p class="min-w-0 flex-1 truncate text-sm font-medium">${upload.name}</p>
                  <div class="flex shrink-0 items-center">
                    ${upload.failed
                      ? html`
                          <${IconButton}
                            id=${`retry-${upload.id}`}
                            label=${`Retry upload of ${upload.name}`}
                            dense
                            onClick=${() => onRetry(upload.id)}
                            className="text-accent hover:text-accent"
                          >
                            <${RotateCw} size=${16} aria-hidden="true" />
                          <//>
                        `
                      : null}
                    <${IconButton}
                      label=${upload.failed
                        ? `Dismiss ${upload.name}`
                        : `Cancel upload of ${upload.name}`}
                      dense
                      onClick=${() => onDismiss(upload.id)}
                    >
                      <${X} size=${16} aria-hidden="true" />
                    <//>
                  </div>
                </div>
                <p
                  class=${upload.failed ? "mt-0.5 text-xs text-danger" : "mt-0.5 text-xs text-muted"}
                  aria-live="polite"
                >
                  ${upload.status}
                </p>
                <div class="flex items-center gap-2">
                  <${Progress}
                    ratio=${upload.ratio}
                    failed=${upload.failed}
                    label=${`Uploading ${upload.name}`}
                    className="mt-1.5 flex-1"
                  />
                  <span class="text-xs text-muted tabular-nums">${formatSize(upload.size)}</span>
                </div>
              </li>
            `,
          )}
        </ul>
      `}
    <//>
  `;
}
