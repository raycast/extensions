import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "ghost" | "danger";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-[background-color,border-color,color,filter] duration-150 active:translate-y-px disabled:cursor-default disabled:opacity-50 disabled:active:translate-y-0";

/** `small` keeps dialog toolbars from towering over their own title. */
const SIZES = {
  default: "min-h-11 px-3 text-sm sm:min-h-9",
  small: "min-h-9 px-2.5 text-xs sm:min-h-8",
} as const;

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  ghost: "border border-line bg-background text-ink hover:border-muted hover:bg-surface",
  danger: "border border-line bg-background text-danger hover:bg-surface",
};

export function Button({
  variant = "ghost",
  size = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return (
    <button
      type="button"
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
      {...props}
    />
  );
}
