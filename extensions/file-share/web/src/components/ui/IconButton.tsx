import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * A square button that carries an icon only. The label is required: it becomes the accessible name, so an
 * icon-only control is still announced (and still explainable) without a tooltip.
 */
export function IconButton({
  label,
  tone = "default",
  dense = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "default" | "danger";
  /** Tighter hit box for actions inside a popover row; the default keeps the full touch target. */
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150",
        "hover:bg-surface hover:text-ink disabled:cursor-default disabled:opacity-50",
        dense ? "size-9 sm:size-7" : "size-11 sm:size-9",
        tone === "danger" && "hover:text-danger",
        className,
      )}
      {...props}
    />
  );
}
