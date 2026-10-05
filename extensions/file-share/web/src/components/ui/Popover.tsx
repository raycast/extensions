import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * A small anchored panel. It is deliberately hand-rolled: the page needs exactly one of these, and writing it
 * keeps the bundle free of another dependency. Escape and a click outside both close it, and focus moves into
 * the panel so keyboard users are not left behind on the trigger.
 */
export function Popover({
  label,
  trigger,
  children,
  className,
}: {
  label: string;
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
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

  return (
    <div ref={container} className="relative">
      {trigger({ open, toggle: () => setOpen((current) => !current) })}
      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          className={cn(
            "absolute top-[calc(100%+0.5rem)] right-0 z-40 rounded-2xl border border-line bg-background p-3 shadow-xl",
            "w-[min(22rem,calc(100vw-2rem))] focus:outline-none",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
