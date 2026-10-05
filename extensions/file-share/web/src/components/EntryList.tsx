import { ArrowDownToLine, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { formatDate, formatRelativeDate, formatSize, previewKind } from "../format";
import { cn } from "../lib/cn";
import { fileVisual } from "../lib/file-icons";
import { useMediaQuery } from "../lib/use-media-query";
import { Checkbox } from "./ui/Checkbox";
import { IconButton } from "./ui/IconButton";

export type Row = {
  key: string;
  name: string;
  kind: "file" | "directory" | "text";
  /** Set for rows that belong to a list entry: the entry id, or the id of the directory being browsed. */
  entryId?: string;
  path?: string;
  size?: number;
  mtimeMs?: number;
  note?: string;
  /** Only list entries can be removed. */
  removable?: boolean;
};

const HEADER_CELL = "sticky top-0 z-10 bg-surface py-2 shadow-[0_1px_0_0_var(--line)]";

/** A highlighted title is the preview affordance: no separate button, the name itself is the control. */
function opensInBrowser(row: Row): boolean {
  if (row.kind === "directory" || row.kind === "text") return true;
  return previewKind(row.name) !== "none";
}

/** Size and date in one line: the wide table has a column for each, narrow screens have one line together. */
function wideSummary(row: Row): string {
  if (row.kind === "directory") return "Folder";
  if (row.kind === "text") return "Text";
  return `${formatSize(row.size ?? 0)} · ${formatDate(row.mtimeMs ?? Date.now())}`;
}

function narrowSummary(row: Row): string {
  if (row.kind === "directory") return "Folder";
  if (row.kind === "text") return row.note ?? "Text";
  // A relative time keeps this line inside a phone width; the table still shows the exact date.
  return `${formatSize(row.size ?? 0)} · ${formatRelativeDate(row.mtimeMs ?? Date.now())}`;
}

function selectionSummary(rows: Row[], selection: string[]): string {
  if (selection.length > 0) return `${selection.length} selected`;
  const count = rows.length;
  const label = `${count} item${count === 1 ? "" : "s"}`;
  const bytes = rows.reduce((total, row) => total + (row.kind === "file" ? (row.size ?? 0) : 0), 0);
  return bytes > 0 ? `${label} · ${formatSize(bytes)}` : label;
}

type Handlers = {
  onToggle: (key: string) => void;
  onToggleAll: (checked: boolean) => void;
  onActivate: (row: Row) => void;
  onDownload: (row: Row) => void;
  onDelete: (row: Row) => void;
};

export function EntryList({
  rows,
  selection,
  emptyText,
  emptyHint,
  emptyAction,
  onToggle,
  onToggleAll,
  onActivate,
  onDownload,
  onDelete,
}: {
  rows: Row[];
  selection: string[];
  emptyText: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
} & Handlers) {
  // A table needs columns to be worth it; on a phone the same rows read better as a stack (the pattern every
  // mobile file list uses: leading type icon, name, one secondary line, trailing actions).
  const wide = useMediaQuery("(min-width: 640px)");
  const selectable = rows.filter((row) => row.kind !== "text");
  const allSelected = selectable.length > 0 && selectable.every((row) => selection.includes(row.key));
  const someSelected = !allSelected && selectable.some((row) => selection.includes(row.key));

  // The empty state stays short on purpose: an oversized empty box is worse than a compact one, and it is a
  // different thing from the table, which keeps a fixed height so the drop area never changes size.
  if (rows.length === 0) {
    return (
      <section
        className={cn(
          "flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center",
          !wide && "flex-1",
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-surface text-muted">
          <Upload size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium">{emptyText}</p>
          {emptyHint ? <p className="mt-1 text-sm text-muted">{emptyHint}</p> : null}
        </div>
        {emptyAction}
      </section>
    );
  }

  const selectAll = (
    <Checkbox
      id="select-all"
      checked={allSelected ? true : someSelected ? "indeterminate" : false}
      label={allSelected ? "Deselect all files" : "Select all files"}
      onCheckedChange={() => onToggleAll(!allSelected)}
    />
  );

  const actions = (row: Row) => (
    <div className="flex shrink-0 items-center">
      {row.kind !== "text" && row.entryId !== undefined ? (
        <IconButton label={`Download ${row.name}`} onClick={() => onDownload(row)}>
          <ArrowDownToLine size={17} aria-hidden="true" />
        </IconButton>
      ) : null}
      {row.removable ? (
        <IconButton label={`Remove ${row.name}`} tone="danger" onClick={() => onDelete(row)}>
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "themed-scroll overflow-y-auto rounded-2xl border border-line bg-background",
        // Wide screens keep a fixed height; a phone gives the list everything left under the toolbar.
        wide ? "h-[min(30rem,58vh)]" : "min-h-[8rem] flex-1",
      )}
    >
      {wide ? (
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">Shared items</caption>
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className={cn(HEADER_CELL, "w-14 px-2 sm:px-4")}>
                <span className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9">{selectAll}</span>
              </th>
              <th scope="col" className={cn(HEADER_CELL, "px-2 font-medium sm:px-3")}>
                Name
              </th>
              <th scope="col" className={cn(HEADER_CELL, "hidden w-24 px-3 text-right font-medium sm:table-cell")}>
                Size
              </th>
              <th scope="col" className={cn(HEADER_CELL, "hidden w-44 px-3 text-right font-medium sm:table-cell")}>
                Modified
              </th>
              <th scope="col" className={cn(HEADER_CELL, "w-24 px-2 sm:px-3")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const { Icon, tone } = fileVisual(row.kind, row.name);
              const highlighted = opensInBrowser(row);
              return (
                <tr
                  key={row.key}
                  data-path={row.key}
                  className="row border-t border-line transition-colors duration-150 hover:bg-surface/50"
                >
                  <td className="px-2 py-1.5 align-middle sm:px-4">
                    {row.kind === "text" ? null : (
                      <span className="flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9">
                        <Checkbox
                          checked={selection.includes(row.key)}
                          label={`Select ${row.name}`}
                          onCheckedChange={() => onToggle(row.key)}
                        />
                      </span>
                    )}
                  </td>
                  <td className="min-w-0 px-2 py-2 align-middle sm:px-3">
                    <button
                      type="button"
                      className="group flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-left"
                      title={row.note ? `${row.name} · ${row.note}` : row.name}
                      onClick={() => onActivate(row)}
                    >
                      <Icon size={18} className={cn("shrink-0", tone)} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            highlighted ? "text-accent group-hover:underline" : "text-ink",
                          )}
                        >
                          {row.name}
                        </span>
                      </span>
                    </button>
                  </td>
                <td className="hidden px-3 py-3 text-right align-middle text-xs whitespace-nowrap text-muted tabular-nums sm:table-cell">
                  {row.kind === "file" ? formatSize(row.size ?? 0) : wideSummary(row)}
                </td>
                <td className="hidden px-3 py-3 text-right align-middle text-xs whitespace-nowrap text-muted tabular-nums sm:table-cell">
                  {row.kind === "file" ? formatDate(row.mtimeMs ?? Date.now()) : "—"}
                  </td>
                  <td className="px-2 py-2 align-middle sm:px-3">{actions(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <>
          <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-line bg-surface py-1.5 pr-3 pl-2">
            <span className="flex size-10 shrink-0 items-center justify-center">{selectAll}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted tabular-nums">
              {selectionSummary(rows, selection)}
            </span>
          </div>
          <ul className="m-0 list-none p-0">
            {rows.map((row) => {
              const { Icon, tone } = fileVisual(row.kind, row.name);
              const highlighted = opensInBrowser(row);
              return (
                <li
                  key={row.key}
                  data-path={row.key}
                  className="row flex items-center gap-1 border-b border-line px-1.5 py-1.5 last:border-b-0"
                >
                  {row.kind === "text" ? (
                    <span className="size-11 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center">
                      <Checkbox
                        checked={selection.includes(row.key)}
                        label={`Select ${row.name}`}
                        onCheckedChange={() => onToggle(row.key)}
                      />
                    </span>
                  )}
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-left"
                    title={row.note ? `${row.name} · ${row.note}` : row.name}
                    onClick={() => onActivate(row)}
                  >
                    <Icon size={20} className={cn("shrink-0", tone)} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[15px] leading-tight font-medium",
                          highlighted ? "text-accent" : "text-ink",
                        )}
                      >
                        {row.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted tabular-nums">
                        {narrowSummary(row)}
                      </span>
                    </span>
                  </button>
                  {actions(row)}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
