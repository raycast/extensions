import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";
import { cn } from "../../cn.js";
import { X } from "../../icons.js";

/**
 * Native <dialog> with showModal / close — same open/Esc/backdrop behaviour as the Radix shell.
 * `size`: default 44rem · wide 60rem (previews) · narrow 26rem (confirm).
 */
export function Dialog({
  open,
  onOpenChange,
  id,
  title,
  toolbar,
  children,
  className,
  size = "default",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onClose = () => onOpenChange(false);
    node.addEventListener("close", onClose);
    return () => node.removeEventListener("close", onClose);
  }, [onOpenChange]);

  const sizeClass =
    size === "wide" ? "fs-dialog-panel--wide" : size === "narrow" ? "fs-dialog-panel--narrow" : "";
  const titleId = `${id ?? "fs-dialog"}-title`;

  return html`
    <dialog
      ref=${ref}
      id=${id}
      class="fs-dialog"
      aria-labelledby=${titleId}
      onClick=${(event) => {
        if (event.target === ref.current) onOpenChange(false);
      }}
    >
      <div
        class=${cn(
          "fs-dialog-panel rounded-2xl",
          "border border-line bg-background p-5 text-ink shadow-2xl focus:outline-none",
          "themed-scroll overflow-y-auto",
          sizeClass,
          className,
        )}
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h2 id=${titleId} class="text-base font-semibold">${title}</h2>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            ${toolbar}
            <button
              type="button"
              aria-label="Close"
              class="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface hover:text-ink sm:size-8"
              onClick=${() => onOpenChange(false)}
            >
              <${X} size=${16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="mt-4">${children}</div>
      </div>
    </dialog>
  `;
}
