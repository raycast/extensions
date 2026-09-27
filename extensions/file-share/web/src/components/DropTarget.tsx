import { CloudUpload } from "lucide-react";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";

type Dropped = { files: File[]; folders: number };

function collect(event: DragEvent<HTMLDivElement>): Dropped {
  const items = Array.from(event.dataTransfer?.items ?? []);
  const files: File[] = [];
  let folders = 0;
  for (const item of items) {
    if (item.kind !== "file") continue;
    const entry = typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
    if (entry?.isDirectory) {
      folders += 1;
      continue;
    }
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  // Some browsers hand over nothing useful through `items`; the plain file list still works.
  if (files.length === 0 && folders === 0) files.push(...Array.from(event.dataTransfer?.files ?? []));
  return { files, folders };
}

/**
 * Files can be dropped anywhere over the list — whether it is empty or already full — and the whole area
 * turns into the drop hint while a file is carried over it. Uploading by button stays available, so dragging
 * is never the only way in.
 */
export function DropTarget({
  onDrop,
  children,
  className,
}: {
  onDrop: (dropped: Dropped) => void;
  children: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  const carriesFiles = (event: DragEvent<HTMLDivElement>) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  return (
    <div
      data-dropzone="files"
      className={cn("relative", className)}
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setActive(true);
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        // Re-arm here as well: a stray dragleave from a child element must not leave the hint behind.
        depth.current = 1;
        setActive(true);
      }}
      onDragLeave={() => {
        depth.current = Math.max(depth.current - 1, 0);
        if (depth.current === 0) setActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        const dropped = collect(event);
        if (dropped.files.length > 0 || dropped.folders > 0) onDrop(dropped);
      }}
    >
      {children}
      {active ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-background/85 px-4 text-center backdrop-blur-sm">
          <CloudUpload size={28} className="text-accent" aria-hidden="true" />
          <p className="text-sm font-semibold">Drop files to share</p>
          <p className="text-xs text-muted">Everyone in this session sees them right away.</p>
        </div>
      ) : null}
    </div>
  );
}
