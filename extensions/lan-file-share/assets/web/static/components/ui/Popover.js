import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { cn } from "../../cn.js";

export function Popover({ label, trigger, children, className }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    panel.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return html`
    <div ref=${container} class="relative">
      ${trigger({ open, toggle: () => setOpen((current) => !current) })}
      ${open
        ? html`
            <div
              ref=${panel}
              role="dialog"
              aria-label=${label}
              tabindex=${-1}
              class=${cn(
                "absolute top-[calc(100%+0.5rem)] right-0 z-40 rounded-2xl border border-line bg-background p-3 shadow-xl",
                "w-[min(22rem,calc(100vw-2rem))] focus:outline-none",
                className,
              )}
            >
              ${children(() => setOpen(false))}
            </div>
          `
        : null}
    </div>
  `;
}
