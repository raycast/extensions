import { html } from "htm/preact";
import { CheckCircle2, Info, XCircle } from "../../icons.js";

export function Toaster({ toasts }) {
  if (toasts.length === 0) return null;

  return html`
    <div
      id="toaster"
      aria-live="polite"
      aria-atomic="false"
      class="app-toaster pointer-events-none fixed inset-x-0 z-60 flex flex-col-reverse items-center gap-2 px-4"
    >
      ${toasts.map(
        (toast) => html`
          <div
            key=${toast.id}
            class="pointer-events-auto flex max-w-full items-center gap-2 rounded-xl border border-line bg-background px-4 py-2 text-sm shadow-lg"
          >
            ${toast.tone === "success"
              ? html`<${CheckCircle2} size=${16} className="shrink-0 text-accent" aria-hidden="true" />`
              : toast.tone === "info"
                ? html`<${Info} size=${16} className="shrink-0 text-muted" aria-hidden="true" />`
                : html`<${XCircle} size=${16} className="shrink-0 text-danger" aria-hidden="true" />`}
            <span class="min-w-0">${toast.message}</span>
          </div>
        `,
      )}
    </div>
  `;
}
