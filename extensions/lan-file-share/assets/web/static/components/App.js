import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";
import { subscribeToChanges } from "../api.js";
import { cn } from "../cn.js";
import { useAppStore, useMediaQuery } from "../hooks.js";
import {
  ArrowDownToLine,
  ListX,
  MessageSquareText,
  RefreshCw,
  Search,
  Upload as UploadIcon,
} from "../icons.js";
import { deriveRows, store } from "../store.js";
import { DropTarget } from "./DropTarget.js";
import { EntryList } from "./EntryList.js";
import { PreviewDialog } from "./PreviewDialog.js";
import { TextDialog } from "./TextDialog.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { UploadTray } from "./UploadTray.js";
import { Button } from "./ui/Button.js";
import { Dialog } from "./ui/Dialog.js";
import { IconButton } from "./ui/IconButton.js";
import { Toaster } from "./ui/Toaster.js";

export function App() {
  const state = useAppStore();
  const wide = useMediaQuery("(min-width: 640px)");
  const fileInput = useRef(null);

  const {
    location,
    query,
    selection,
    error,
    isLoading,
    uploads,
    preview,
    textOpen,
    clearOpen,
    toasts,
    entries,
  } = state;

  const rows = deriveRows(state);
  const selectedRows = rows.filter(
    (row) => selection.includes(row.key) && row.kind !== "text" && row.entryId !== undefined,
  );

  useEffect(() => {
    void store.getState().load(location);
  }, [location]);

  useEffect(() => subscribeToChanges(() => void store.getState().load()), []);

  useEffect(() => {
    const swallow = (event) => event.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  const segments = location.kind === "browse" && location.dir !== "" ? location.dir.split("/") : [];
  const showSkeleton = isLoading && rows.length === 0;
  const entryCount = entries.length;
  const actions = store.getState();

  return html`
    <div class="flex h-dvh flex-col">
      <header class="mx-auto w-full max-w-5xl px-4 pt-8 pb-7 sm:px-6">
        <h1 id="share-name" class="display-title text-3xl leading-tight sm:text-4xl">LAN File Share</h1>
        <p id="share-subtitle" class="mt-2 text-sm text-muted">
          High-speed transfers over your local network.
        </p>
      </header>

      <input
        type="file"
        id="file-input"
        multiple
        hidden
        aria-hidden="true"
        tabindex=${-1}
        ref=${fileInput}
        onChange=${(event) => {
          actions.queueFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <main class="app-main mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <${Button} id="upload" variant="primary" onClick=${() => fileInput.current?.click()}>
            <${UploadIcon} size=${16} aria-hidden="true" />
            Upload Files
          <//>
          <${Button} id="send-text" onClick=${() => actions.setTextOpen(true)}>
            <${MessageSquareText} size=${16} aria-hidden="true" />
            Share Text
          <//>
          ${selectedRows.length > 0
            ? html`
                <${Button} id="download-selected" onClick=${() => actions.downloadSelection(selectedRows)}>
                  <${ArrowDownToLine} size=${16} aria-hidden="true" />
                  Download
                <//>
              `
            : null}

          <div class="flex w-full items-center gap-1.5 sm:ms-auto sm:w-auto">
            <div class="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
              <${Search}
                size=${16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <label for="search" class="sr-only">Search the share list</label>
              <input
                id="search"
                type="search"
                value=${query}
                placeholder="Search by name"
                onInput=${(event) => actions.setQuery(event.target.value)}
                class="min-h-11 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-base text-ink placeholder:text-muted sm:min-h-9 sm:text-sm"
              />
            </div>
            <${IconButton} id="refresh" label="Refresh the list" onClick=${() => void actions.load()}>
              <${RefreshCw}
                size=${18}
                className=${isLoading ? "animate-spin" : undefined}
                aria-hidden="true"
              />
            <//>
            ${location.kind === "list" && entryCount > 0
              ? html`
                  <${IconButton}
                    id="clear-list"
                    tone="danger"
                    label="Clear the list"
                    onClick=${() => actions.setClearOpen(true)}
                  >
                    <${ListX} size=${18} aria-hidden="true" />
                  <//>
                `
              : null}
            <${ThemeToggle} />
            <${UploadTray}
              uploads=${uploads}
              onDismiss=${actions.dismissUpload}
              onRetry=${actions.retryUpload}
            />
          </div>
        </div>

        ${location.kind === "browse"
          ? html`
              <nav
                id="breadcrumb"
                aria-label="Folder path"
                class="mt-5 mb-3 flex flex-wrap items-center gap-1 text-sm"
              >
                <button
                  type="button"
                  class="cursor-pointer rounded px-1 text-accent hover:bg-surface"
                  onClick=${() => {
                    if (location.dir === "") actions.goTo({ kind: "list" });
                    else
                      actions.goTo({
                        ...location,
                        dir: location.dir.split("/").slice(0, -1).join("/"),
                      });
                  }}
                >
                  ${location.dir === "" ? "← Share List" : "↑ Up"}
                </button>
                <span class="text-muted">/</span>
                <button
                  type="button"
                  class="cursor-pointer rounded px-1 text-accent hover:bg-surface"
                  onClick=${() => actions.goTo({ ...location, dir: "" })}
                >
                  ${location.name}
                </button>
                ${segments.map(
                  (segment, index) => html`
                    <span key=${`${segment}-${index}`} class="flex items-center gap-1">
                      <span class="text-muted" aria-hidden="true">/</span>
                      <button
                        type="button"
                        class="cursor-pointer rounded px-1 text-accent hover:bg-surface"
                        onClick=${() =>
                          actions.goTo({
                            ...location,
                            dir: segments.slice(0, index + 1).join("/"),
                          })}
                      >
                        ${segment}
                      </button>
                    </span>
                  `,
                )}
              </nav>
            `
          : null}

        ${error
          ? html`
              <div
                id="list-error"
                role="alert"
                class="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-danger"
              >
                <span class="min-w-0 flex-1">${error}</span>
                <${Button} onClick=${() => void actions.load()}>Try Again<//>
              </div>
            `
          : null}

        <div class=${cn("mt-3", !wide && "flex min-h-0 flex-1 flex-col")}>
          <${DropTarget}
            className=${wide ? undefined : "flex min-h-0 flex-1 flex-col"}
            onDrop=${({ files, folders }) => {
              if (folders > 0)
                actions.notify(
                  "Folders are skipped — drop files, or share a folder from Raycast.",
                  "info",
                );
              actions.queueFiles(files);
            }}
          >
            ${showSkeleton
              ? html`
                  <ul
                    class="m-0 list-none divide-y divide-line overflow-hidden rounded-2xl border border-line p-0"
                  >
                    ${[0, 1, 2].map(
                      (index) => html`
                        <li key=${index} class="flex items-center gap-3 px-4 py-4">
                          <div class="size-5 animate-pulse rounded-md bg-surface"></div>
                          <div class="h-4 flex-1 animate-pulse rounded bg-surface"></div>
                        </li>
                      `,
                    )}
                  </ul>
                `
              : html`
                  <${EntryList}
                    rows=${rows}
                    selection=${selection}
                    emptyText=${query === "" ? "Nothing is shared yet." : "Nothing matches that search."}
                    emptyHint=${query === ""
                      ? "Drag files onto this area, or upload them from the toolbar above."
                      : undefined}
                    emptyAction=${query === ""
                      ? html`
                          <${Button} variant="primary" onClick=${() => fileInput.current?.click()}>
                            <${UploadIcon} size=${16} aria-hidden="true" />
                            Upload Files
                          <//>
                        `
                      : null}
                    onToggle=${actions.toggle}
                    onToggleAll=${(checked) =>
                      actions.toggleAll(
                        checked,
                        rows.filter((row) => row.kind !== "text").map((row) => row.key),
                      )}
                    onActivate=${actions.activate}
                    onDownload=${actions.downloadRow}
                    onDelete=${(row) => void actions.removeRow(row)}
                  />
                `}
          <//>
        </div>
      </main>

      <${TextDialog}
        open=${textOpen}
        onClose=${() => actions.setTextOpen(false)}
        onShared=${() => actions.notify("Text shared")}
      />
      <${Dialog}
        open=${clearOpen}
        onOpenChange=${(next) => {
          if (!next) actions.setClearOpen(false);
        }}
        id="clear-dialog"
        title="Clear the whole list?"
        size="narrow"
      >
        <p class="text-sm text-muted">
          All ${entryCount} ${entryCount === 1 ? "entry" : "entries"} disappear for everyone in this
          session. Files and folders on the disk are not deleted.
        </p>
        <div class="mt-4 flex flex-wrap justify-end gap-2">
          <${Button} onClick=${() => actions.setClearOpen(false)}>Cancel<//>
          <${Button} id="clear-confirm" variant="danger" onClick=${() => void actions.clearEverything()}>
            Clear List
          <//>
        </div>
      <//>
      <${PreviewDialog}
        target=${preview}
        onClose=${() => actions.setPreview(undefined)}
        onDownloadError=${actions.downloadFailed}
      />
      <${Toaster} toasts=${toasts} />
    </div>
  `;
}
