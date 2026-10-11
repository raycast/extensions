import {
  ArrowDownToLine,
  MessageSquareText,
  ListX,
  RefreshCw,
  Search,
  Upload as UploadIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cancelUpload,
  clearList,
  download,
  fetchBrowse,
  fetchEntries,
  fileUrl,
  removeEntry,
  subscribeToChanges,
  uploadFile,
  type BrowsedItem,
  type Entry,
} from "./api";
import { DropTarget } from "./components/DropTarget";
import { EntryList, type Row } from "./components/EntryList";
import { PreviewDialog, type PreviewTarget } from "./components/PreviewDialog";
import { TextDialog } from "./components/TextDialog";
import { ThemeToggle } from "./components/ThemeToggle";
import { UploadTray, type Upload } from "./components/UploadTray";
import { Button } from "./components/ui/Button";
import { Dialog } from "./components/ui/Dialog";
import { IconButton } from "./components/ui/IconButton";
import { Toaster, type Toast } from "./components/ui/Toaster";
import { previewKind } from "./format";
import { cn } from "./lib/cn";
import { useMediaQuery } from "./lib/use-media-query";

type Location =
  | { kind: "list" }
  | { kind: "browse"; entryId: string; name: string; dir: string };

export default function App() {
  const wide = useMediaQuery("(min-width: 640px)");
  const [location, setLocation] = useState<Location>({ kind: "list" });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<BrowsedItem[]>([]);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [preview, setPreview] = useState<PreviewTarget>();
  const [textOpen, setTextOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const serverIds = useRef(new Map<string, string>());
  /** The picked file per row, so a failed transfer can be retried without asking for it again. */
  const uploadFiles = useRef(new Map<string, File>());
  /** Row id per upload key, so dropping or picking the same file twice continues one transfer. */
  const uploadRows = useRef(new Map<string, string>());

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(
        () =>
          setToasts((current) => current.filter((toast) => toast.id !== id)),
        4000,
      );
    },
    [],
  );

  /** A download that cannot start is reported in place, so nobody ends up on a bare JSON error page. */
  const downloadFailed = useCallback(
    (message: string) => notify(message, "failure"),
    [notify],
  );

  const load = useCallback(async (target: Location) => {
    setIsLoading(true);
    try {
      setError(undefined);
      if (target.kind === "list") {
        setEntries(await fetchEntries());
      } else {
        const browse = await fetchBrowse(target.entryId, target.dir);
        setItems(browse.entries);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(location);
  }, [load, location]);

  // Anyone adding or removing something shows up here without touching the refresh button.
  useEffect(
    () => subscribeToChanges(() => void load(location)),
    [load, location],
  );

  // Dropping a file next to the list should never make the browser navigate away to that file.
  useEffect(() => {
    const swallow = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", swallow);
    window.addEventListener("drop", swallow);
    return () => {
      window.removeEventListener("dragover", swallow);
      window.removeEventListener("drop", swallow);
    };
  }, []);

  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase();
    if (location.kind === "list") {
      return (
        entries
          // A file that is gone from disk is not shown at all: the entry stays in the list file, so putting the
          // file back makes it reappear, but nobody is offered a row that cannot be opened.
          .filter((entry) => !entry.missing)
          .filter(
            (entry) =>
              needle === "" ||
              entry.name.toLowerCase().includes(needle) ||
              (entry.content ?? "").toLowerCase().includes(needle),
          )
          .map((entry) => ({
            key: entry.id,
            name: entry.name,
            kind: entry.type,
            entryId: entry.id,
            size: entry.size,
            mtimeMs: entry.mtimeMs,
            note: entry.source === "host" ? "Text" : `from ${entry.source}`,
            removable: true,
          }))
      );
    }
    return items
      .filter(
        (item) => needle === "" || item.name.toLowerCase().includes(needle),
      )
      .map((item) => ({
        key: item.path,
        name: item.name,
        kind: item.type,
        entryId: location.entryId,
        path: item.path,
        size: item.size,
        mtimeMs: item.mtimeMs,
      }));
  }, [entries, items, location, query]);

  const selectedRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          selection.includes(row.key) &&
          row.kind !== "text" &&
          row.entryId !== undefined,
      ),
    [rows, selection],
  );

  const toggle = (key: string) =>
    setSelection((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );

  const toggleAll = (checked: boolean) =>
    setSelection(
      checked
        ? rows.filter((row) => row.kind !== "text").map((row) => row.key)
        : [],
    );

  const goTo = (target: Location) => {
    setLocation(target);
    setSelection([]);
  };

  const previewText = (row: Row) => {
    const entry = entries.find((item) => item.id === row.entryId);
    setPreview({ name: row.name, kind: "text", text: entry?.content ?? "" });
  };

  /** The name itself is the control: highlighted names open a preview, everything else downloads. */
  const activate = (row: Row) => {
    if (row.kind === "directory") {
      if (row.entryId === undefined) return;
      if (row.path === undefined)
        goTo({ kind: "browse", entryId: row.entryId, name: row.name, dir: "" });
      else if (location.kind === "browse") goTo({ ...location, dir: row.path });
      return;
    }
    if (row.kind === "text") {
      previewText(row);
      return;
    }
    if (row.entryId === undefined) return;
    const kind = previewKind(row.name);
    if (kind === "none") {
      void download(
        [{ entry: row.entryId, path: row.path ?? "" }],
        downloadFailed,
      );
      return;
    }
    // The browser's PDF viewer cannot be styled to match the page, so a PDF gets a real tab. The dialog stays
    // as the fallback for when the popup never opened. No `noopener` feature string: with it the call always
    // returns null, which would look like a blocked popup.
    if (kind === "pdf") {
      const opened = window.open(
        fileUrl(row.entryId, row.path ?? "", false),
        "_blank",
      );
      if (opened) {
        try {
          opened.opener = null;
        } catch {
          // Cross-origin windows refuse the assignment; the tab is open either way.
        }
        return;
      }
    }
    setPreview({
      name: row.name,
      kind,
      entryId: row.entryId,
      path: row.path ?? "",
    });
  };

  const downloadRow = (row: Row) => {
    if (row.kind === "text" || row.entryId === undefined) return;
    // The service decides between a plain file and a zip, so a folder row and a file row are the same call.
    void download(
      [{ entry: row.entryId, path: row.path ?? "" }],
      downloadFailed,
    );
  };

  const downloadSelection = () =>
    void download(
      selectedRows.map((row) => ({
        entry: row.entryId ?? "",
        path: row.path ?? "",
      })),
      downloadFailed,
    );

  /** Removing an entry only takes it off the list: nothing is deleted from disk, so there is no confirmation. */
  const removeRow = async (row: Row) => {
    if (row.entryId === undefined) return;
    try {
      await removeEntry(row.entryId);
      setSelection((current) => current.filter((key) => key !== row.key));
      notify(`Removed ${row.name}`);
      await load(location);
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : String(reason),
        "failure",
      );
    }
  };

  /** Clearing takes every entry off the list for everyone; the files on disk are not touched. */
  const clearEverything = async () => {
    setClearOpen(false);
    try {
      await clearList();
      setSelection([]);
      notify("List cleared");
      await load(location);
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : String(reason),
        "failure",
      );
    }
  };

  /** Same key the service derives its upload id from: name, size and modification time. */
  const uploadKey = (file: File) =>
    `${file.name}|${file.size}|${file.lastModified}`;

  const patchUpload = (id: string, changes: Partial<Upload>) =>
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

  const runUpload = (id: string, file: File) => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    patchUpload(id, { ratio: 0, status: "Starting…", failed: false });

    uploadFile(file, (ratio, status) => patchUpload(id, { ratio, status }), {
      signal: controller.signal,
      onStarted: (uploadId) => serverIds.current.set(id, uploadId),
    })
      .then(async (name) => {
        // Finished uploads are rows in the list now, so they leave the uploads panel.
        setUploads((current) => current.filter((item) => item.id !== id));
        uploadFiles.current.delete(id);
        uploadRows.current.delete(uploadKey(file));
        notify(`Uploaded ${name}`);
        await load(location);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        patchUpload(id, {
          status: `${reason instanceof Error ? reason.message : String(reason)} — retry to continue.`,
          failed: true,
        });
        notify(`Upload failed: ${file.name}`, "failure");
      })
      .finally(() => {
        controllers.current.delete(id);
        serverIds.current.delete(id);
      });
  };

  const queueUpload = (file: File) => {
    const key = uploadKey(file);
    const known = uploadRows.current.get(key);
    if (known !== undefined) {
      // The same file again: keep the one row and pick the transfer back up where it stopped.
      uploadFiles.current.set(known, file);
      if (uploads.find((upload) => upload.id === known)?.failed)
        runUpload(known, file);
      return;
    }

    const id = `${key}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    uploadFiles.current.set(id, file);
    uploadRows.current.set(key, id);
    setUploads((current) => [
      ...current,
      {
        id,
        key,
        name: file.name,
        size: file.size,
        ratio: 0,
        status: "Starting…",
        failed: false,
      },
    ]);
    runUpload(id, file);
  };

  const retryUpload = (id: string) => {
    const file = uploadFiles.current.get(id);
    if (!file) {
      notify(
        "That file is no longer available — pick it again to resume.",
        "failure",
      );
      return;
    }
    runUpload(id, file);
  };

  const queueFiles = (files: File[]) => {
    for (const file of files) queueUpload(file);
  };

  const dismissUpload = (id: string) => {
    const name = uploads.find((upload) => upload.id === id)?.name ?? "Upload";
    const wasRunning = !uploads.find((upload) => upload.id === id)?.failed;
    controllers.current.get(id)?.abort();
    const serverId = serverIds.current.get(id);
    if (serverId) void cancelUpload(serverId).catch(() => undefined);
    controllers.current.delete(id);
    serverIds.current.delete(id);
    const kept = uploads.find((upload) => upload.id === id);
    if (kept) {
      uploadFiles.current.delete(id);
      uploadRows.current.delete(kept.key);
    }
    setUploads((current) => current.filter((upload) => upload.id !== id));
    if (wasRunning) notify(`Cancelled ${name}`, "info");
  };

  const segments =
    location.kind === "browse" && location.dir !== ""
      ? location.dir.split("/")
      : [];
  const showSkeleton = isLoading && rows.length === 0;
  const entryCount = entries.length;

  return (
    <div className="flex h-dvh flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 pt-8 pb-7 sm:px-6">
        <h1
          id="share-name"
          className="display-title text-3xl leading-tight sm:text-4xl"
        >
          File Share
        </h1>
        <p id="share-subtitle" className="mt-2 text-sm text-muted">
          High-speed transfers over your local network.
        </p>
      </header>

      <input
        type="file"
        id="file-input"
        multiple
        hidden
        ref={fileInput}
        onChange={(event) => {
          queueFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <main className="app-main mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            id="upload"
            variant="primary"
            onClick={() => fileInput.current?.click()}
          >
            <UploadIcon size={16} aria-hidden="true" />
            Upload Files
          </Button>
          <Button id="send-text" onClick={() => setTextOpen(true)}>
            <MessageSquareText size={16} aria-hidden="true" />
            Share Text
          </Button>
          {selectedRows.length > 0 ? (
            <Button id="download-selected" onClick={downloadSelection}>
              <ArrowDownToLine size={16} aria-hidden="true" />
              Download
            </Button>
          ) : null}

          <div className="flex w-full items-center gap-1.5 sm:ms-auto sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <label htmlFor="search" className="sr-only">
                Search the share list
              </label>
              <input
                id="search"
                type="search"
                value={query}
                placeholder="Search by name"
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-base text-ink placeholder:text-muted sm:min-h-9 sm:text-sm"
              />
            </div>
            <IconButton
              id="refresh"
              label="Refresh the list"
              onClick={() => void load(location)}
            >
              <RefreshCw
                size={18}
                className={isLoading ? "animate-spin" : undefined}
                aria-hidden="true"
              />
            </IconButton>
            {location.kind === "list" && entryCount > 0 ? (
              <IconButton
                id="clear-list"
                tone="danger"
                label="Clear the list"
                onClick={() => setClearOpen(true)}
              >
                <ListX size={18} aria-hidden="true" />
              </IconButton>
            ) : null}
            <ThemeToggle />
            <UploadTray
              uploads={uploads}
              onDismiss={dismissUpload}
              onRetry={retryUpload}
            />
          </div>
        </div>

        {location.kind === "browse" ? (
          <nav
            id="breadcrumb"
            aria-label="Folder path"
            className="mt-5 mb-3 flex flex-wrap items-center gap-1 text-sm"
          >
            <button
              type="button"
              className="cursor-pointer rounded px-1 text-accent hover:bg-surface"
              onClick={() => {
                if (location.dir === "") goTo({ kind: "list" });
                else
                  goTo({
                    ...location,
                    dir: location.dir.split("/").slice(0, -1).join("/"),
                  });
              }}
            >
              {location.dir === "" ? "← Share List" : "↑ Up"}
            </button>
            <span className="text-muted">/</span>
            <button
              type="button"
              className="cursor-pointer rounded px-1 text-accent hover:bg-surface"
              onClick={() => goTo({ ...location, dir: "" })}
            >
              {location.name}
            </button>
            {segments.map((segment, index) => (
              <span
                key={`${segment}-${index}`}
                className="flex items-center gap-1"
              >
                <span className="text-muted" aria-hidden="true">
                  /
                </span>
                <button
                  type="button"
                  className="cursor-pointer rounded px-1 text-accent hover:bg-surface"
                  onClick={() =>
                    goTo({
                      ...location,
                      dir: segments.slice(0, index + 1).join("/"),
                    })
                  }
                >
                  {segment}
                </button>
              </span>
            ))}
          </nav>
        ) : null}

        {error ? (
          <div
            id="list-error"
            role="alert"
            className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-danger"
          >
            <span className="min-w-0 flex-1">{error}</span>
            <Button onClick={() => void load(location)}>Try Again</Button>
          </div>
        ) : null}

        <div className={cn("mt-3", !wide && "flex min-h-0 flex-1 flex-col")}>
          <DropTarget
            className={wide ? undefined : "flex min-h-0 flex-1 flex-col"}
            onDrop={({ files, folders }) => {
              if (folders > 0)
                notify(
                  "Folders are skipped — drop files, or share a folder from Raycast.",
                  "info",
                );
              queueFiles(files);
            }}
          >
            {showSkeleton ? (
              <ul className="m-0 list-none divide-y divide-line overflow-hidden rounded-2xl border border-line p-0">
                {[0, 1, 2].map((index) => (
                  <li key={index} className="flex items-center gap-3 px-4 py-4">
                    <div className="size-5 animate-pulse rounded-md bg-surface" />
                    <div className="h-4 flex-1 animate-pulse rounded bg-surface" />
                  </li>
                ))}
              </ul>
            ) : (
              <EntryList
                rows={rows}
                selection={selection}
                emptyText={
                  query === ""
                    ? "Nothing is shared yet."
                    : "Nothing matches that search."
                }
                emptyHint={
                  query === ""
                    ? "Drag files onto this area, or upload them from the toolbar above."
                    : undefined
                }
                emptyAction={
                  query === "" ? (
                    <Button
                      variant="primary"
                      onClick={() => fileInput.current?.click()}
                    >
                      <UploadIcon size={16} aria-hidden="true" />
                      Upload Files
                    </Button>
                  ) : null
                }
                onToggle={toggle}
                onToggleAll={toggleAll}
                onActivate={activate}
                onDownload={downloadRow}
                onDelete={(row) => void removeRow(row)}
              />
            )}
          </DropTarget>
        </div>
      </main>

      <TextDialog
        open={textOpen}
        onClose={() => setTextOpen(false)}
        onShared={() => notify("Text shared")}
      />
      <Dialog
        open={clearOpen}
        onOpenChange={(next) => {
          if (!next) setClearOpen(false);
        }}
        id="clear-dialog"
        title="Clear the whole list?"
        className="w-[min(26rem,calc(100%-2rem))]"
      >
        <p className="text-sm text-muted">
          All {entryCount} {entryCount === 1 ? "entry" : "entries"} disappear
          for everyone in this session. Files and folders on the disk are not
          deleted.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button onClick={() => setClearOpen(false)}>Cancel</Button>
          <Button
            id="clear-confirm"
            variant="danger"
            onClick={() => void clearEverything()}
          >
            Clear List
          </Button>
        </div>
      </Dialog>
      <PreviewDialog
        target={preview}
        onClose={() => setPreview(undefined)}
        onDownloadError={downloadFailed}
      />
      <Toaster toasts={toasts} />
    </div>
  );
}
