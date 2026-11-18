import { html } from "htm/preact";
import { cn } from "../../cn.js";

export function Progress({ ratio, failed, label, className }) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  return html`
    <div
      class=${cn("h-1.5 overflow-hidden rounded-full bg-surface", className)}
      role="progressbar"
      aria-label=${label}
      aria-valuemin=${0}
      aria-valuemax=${100}
      aria-valuenow=${percent}
    >
      <div
        class=${failed ? "h-full bg-danger" : "h-full bg-accent transition-[width] duration-200"}
        style=${{ width: `${percent}%` }}
      ></div>
    </div>
  `;
}
