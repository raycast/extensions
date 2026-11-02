import { html } from "htm/preact";
import { cn } from "../../cn.js";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-[background-color,border-color,color,filter] duration-150 active:translate-y-px disabled:cursor-default disabled:opacity-50 disabled:active:translate-y-0";

const SIZES = {
  default: "min-h-11 px-3 text-sm sm:min-h-9",
  small: "min-h-9 px-2.5 text-xs sm:min-h-8",
};

const VARIANTS = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  ghost: "border border-line bg-background text-ink hover:border-muted hover:bg-surface",
  danger: "border border-line bg-background text-danger hover:bg-surface",
};

export function Button({
  variant = "ghost",
  size = "default",
  className,
  type = "button",
  children,
  ...props
}) {
  return html`
    <button
      type=${type}
      class=${cn(BASE, SIZES[size], VARIANTS[variant], className)}
      ...${props}
    >
      ${children}
    </button>
  `;
}
