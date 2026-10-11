import { cn } from "../../lib/cn";

export function Progress({
  ratio,
  failed,
  label,
  className,
}: {
  ratio: number;
  failed?: boolean;
  label: string;
  className?: string;
}) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-surface", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className={failed ? "h-full bg-danger" : "h-full bg-accent transition-[width] duration-200"}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
