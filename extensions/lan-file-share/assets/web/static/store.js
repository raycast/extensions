import { createStore } from "zustand/vanilla";
import {
  cancelUpload,
  clearList,
  download,
  fetchBrowse,
  fetchEntries,
  fileUrl,
  removeEntry,
  uploadFile,
} from "./api.js";
import { previewKind } from "./format.js";

/** File / AbortController / server upload ids live outside store state (not clonable). */
const controllers = new Map();
const serverIds = new Map();
const uploadFiles = new Map();
const uploadRows = new Map();

export const store = createStore((set, get) => ({
  location: { kind: "list" },
  entries: [],
  items: [],
  query: "",
  selection: [],
  error: undefined,
  isLoading: true,
  uploads: [],
  preview: undefined,
  textOpen: false,
  clearOpen: false,
  toasts: [],

  setQuery: (query) => set({ query }),
  setTextOpen: (textOpen) => set({ textOpen }),
  setClearOpen: (clearOpen) => set({ clearOpen }),
  setPreview: (preview) => set({ preview }),

  notify: (message, tone = "success") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 4000);
  },

  downloadFailed: (message) => get().notify(message, "failure"),

  load: async (target) => {
    const location = target ?? get().location;
    set({ isLoading: true });
    try {
      set({ error: undefined });
      if (location.kind === "list") {
        set({ entries: await fetchEntries() });
      } else {
        const browse = await fetchBrowse(location.entryId, location.dir);
        set({ items: browse.entries });
      }
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : String(reason) });
    } finally {
      set({ isLoading: false });
    }
  },

  goTo: (target) => {
    set({ location: target, selection: [] });
  },

  toggle: (key) =>
    set((state) => ({
      selection: state.selection.includes(key)
        ? state.selection.filter((item) => item !== key)
        : [...state.selection, key],
    })),

  toggleAll: (checked, rowKeys) => set({ selection: checked ? rowKeys : [] }),

  previewText: (row) => {
    const entry = get().entries.find((item) => item.id === row.entryId);
    set({ preview: { name: row.name, kind: "text", text: entry?.content ?? "" } });
  },

  activate: (row) => {
    const { location, goTo, previewText, downloadFailed } = get();
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
      void download([{ entry: row.entryId, path: row.path ?? "" }], downloadFailed);
      return;
    }
    if (kind === "pdf") {
      const opened = window.open(fileUrl(row.entryId, row.path ?? "", false), "_blank");
      if (opened) {
        try {
          opened.opener = null;
        } catch {
          // Cross-origin windows refuse the assignment; the tab is open either way.
        }
        return;
      }
    }
    set({
      preview: {
        name: row.name,
        kind,
        entryId: row.entryId,
        path: row.path ?? "",
      },
    });
  },

  downloadRow: (row) => {
    if (row.kind === "text" || row.entryId === undefined) return;
    void download([{ entry: row.entryId, path: row.path ?? "" }], get().downloadFailed);
  },

  downloadSelection: (selectedRows) =>
    void download(
      selectedRows.map((row) => ({ entry: row.entryId ?? "", path: row.path ?? "" })),
      get().downloadFailed,
    ),

  removeRow: async (row) => {
    if (row.entryId === undefined) return;
    try {
      await removeEntry(row.entryId);
      set((state) => ({
        selection: state.selection.filter((key) => key !== row.key),
      }));
      get().notify(`Removed ${row.name}`);
      await get().load();
    } catch (reason) {
      get().notify(reason instanceof Error ? reason.message : String(reason), "failure");
    }
  },

  clearEverything: async () => {
    set({ clearOpen: false });
    try {
      await clearList();
      set({ selection: [] });
      get().notify("List cleared");
      await get().load();
    } catch (reason) {
      get().notify(reason instanceof Error ? reason.message : String(reason), "failure");
    }
  },

  patchUpload: (id, changes) =>
    set((state) => ({
      uploads: state.uploads.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    })),

  runUpload: (id, file) => {
    const controller = new AbortController();
    controllers.set(id, controller);
    get().patchUpload(id, { ratio: 0, status: "Starting…", failed: false });

    uploadFile(file, (ratio, status) => get().patchUpload(id, { ratio, status }), {
      signal: controller.signal,
      onStarted: (uploadId) => serverIds.set(id, uploadId),
    })
      .then(async (name) => {
        set((state) => ({ uploads: state.uploads.filter((item) => item.id !== id) }));
        uploadFiles.delete(id);
        uploadRows.delete(uploadKey(file));
        get().notify(`Uploaded ${name}`);
        await get().load();
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        get().patchUpload(id, {
          status: `${reason instanceof Error ? reason.message : String(reason)} — retry to continue.`,
          failed: true,
        });
        get().notify(`Upload failed: ${file.name}`, "failure");
      })
      .finally(() => {
        controllers.delete(id);
        serverIds.delete(id);
      });
  },

  queueUpload: (file) => {
    const key = uploadKey(file);
    const known = uploadRows.get(key);
    if (known !== undefined) {
      uploadFiles.set(known, file);
      if (get().uploads.find((upload) => upload.id === known)?.failed) get().runUpload(known, file);
      return;
    }

    const id = `${key}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    uploadFiles.set(id, file);
    uploadRows.set(key, id);
    set((state) => ({
      uploads: [
        ...state.uploads,
        {
          id,
          key,
          name: file.name,
          size: file.size,
          ratio: 0,
          status: "Starting…",
          failed: false,
        },
      ],
    }));
    get().runUpload(id, file);
  },

  queueFiles: (files) => {
    for (const file of files) get().queueUpload(file);
  },

  retryUpload: (id) => {
    const file = uploadFiles.get(id);
    if (!file) {
      get().notify("That file is no longer available — pick it again to resume.", "failure");
      return;
    }
    get().runUpload(id, file);
  },

  dismissUpload: (id) => {
    const uploads = get().uploads;
    const name = uploads.find((upload) => upload.id === id)?.name ?? "Upload";
    const wasRunning = !uploads.find((upload) => upload.id === id)?.failed;
    controllers.get(id)?.abort();
    const serverId = serverIds.get(id);
    if (serverId) void cancelUpload(serverId).catch(() => undefined);
    controllers.delete(id);
    serverIds.delete(id);
    const kept = uploads.find((upload) => upload.id === id);
    if (kept) {
      uploadFiles.delete(id);
      uploadRows.delete(kept.key);
    }
    set((state) => ({ uploads: state.uploads.filter((upload) => upload.id !== id) }));
    if (wasRunning) get().notify(`Cancelled ${name}`, "info");
  },
}));

function uploadKey(file) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

/** Derive list rows from store state (same filters as the React App). */
export function deriveRows(state) {
  const needle = state.query.trim().toLowerCase();
  if (state.location.kind === "list") {
    return state.entries
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
      }));
  }
  return state.items
    .filter((item) => needle === "" || item.name.toLowerCase().includes(needle))
    .map((item) => ({
      key: item.path,
      name: item.name,
      kind: item.type,
      entryId: state.location.entryId,
      path: item.path,
      size: item.size,
      mtimeMs: item.mtimeMs,
    }));
}
