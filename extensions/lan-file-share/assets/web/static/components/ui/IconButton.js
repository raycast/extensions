import { html } from "htm/preact";
import { cn } from "../../cn.js";

export function IconButton({
  label,
  tone = "default",
  dense = false,
  className,
  children,
  ...props
}) {
  return html`
    <button
      type="button"
      aria-label=${label}
      title=${label}
      class=${cn(
        "inline-grid shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150",
        "hover:bg-surface hover:text-ink disabled:cursor-default disabled:opacity-50",
        dense ? "size-9 sm:size-7" : "size-11 sm:size-9",
        tone === "danger" && "hover:text-danger",
        className,
      )}
      ...${props}
    >
      ${children}
    </button>
  `;
}
