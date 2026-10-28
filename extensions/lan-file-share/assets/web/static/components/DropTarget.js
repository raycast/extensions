import { html } from "htm/preact";
import { useRef, useState } from "preact/hooks";
import { cn } from "../cn.js";
import { CloudUpload } from "../icons.js";

function collect(event) {
  const items = Array.from(event.dataTransfer?.items ?? []);
  const files = [];
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
  if (files.length === 0 && folders === 0) files.push(...Array.from(event.dataTransfer?.files ?? []));
  return { files, folders };
}

export function DropTarget({ onDrop, children, className }) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  const carriesFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

  return html`
    <div
      data-dropzone="files"
      class=${cn("relative", className)}
      onDragEnter=${(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setActive(true);
      }}
      onDragOver=${(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        depth.current = 1;
        setActive(true);
      }}
      onDragLeave=${() => {
        depth.current = Math.max(depth.current - 1, 0);
        if (depth.current === 0) setActive(false);
      }}
      onDrop=${(event) => {
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        const dropped = collect(event);
        if (dropped.files.length > 0 || dropped.folders > 0) onDrop(dropped);
      }}
    >
      ${children}
      ${active
        ? html`
            <div
              role="status"
              aria-live="assertive"
              class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent bg-background/85 px-4 text-center backdrop-blur-sm"
            >
              <${CloudUpload} size=${28} className="text-accent" aria-hidden="true" />
              <p class="text-sm font-semibold">Drop files to share</p>
              <p class="text-xs text-muted">Everyone in this session sees them right away.</p>
            </div>
          `
        : null}
    </div>
  `;
}
