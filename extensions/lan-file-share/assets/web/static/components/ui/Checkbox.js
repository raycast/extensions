import { html } from "htm/preact";
import { cn } from "../../cn.js";
import { Check, Minus } from "../../icons.js";

export function Checkbox({ checked, onCheckedChange, id, label, className }) {
  const state = checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked";
  return html`
    <button
      type="button"
      id=${id}
      role="checkbox"
      aria-checked=${checked === "indeterminate" ? "mixed" : checked}
      aria-label=${label}
      data-state=${state}
      onClick=${() => onCheckedChange(checked !== true)}
      class=${cn(
        "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-background",
        "transition-colors duration-150 hover:border-muted",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-ink",
        "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-ink",
        className,
      )}
    >
      ${checked === "indeterminate"
        ? html`<${Minus} size=${12} stroke-width=${3} />`
        : checked
          ? html`<${Check} size=${12} stroke-width=${3} />`
          : null}
    </button>
  `;
}
