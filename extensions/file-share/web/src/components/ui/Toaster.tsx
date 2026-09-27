import { CheckCircle2, Info, XCircle } from "lucide-react";

export type Toast = {
  id: string;
  message: string;
  tone: "success" | "failure" | "info";
};

/** Announced politely for screen readers, dismissed by the caller after a few seconds. */
export function Toaster({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toaster"
      aria-live="polite"
      aria-atomic="false"
      className="app-toaster pointer-events-none fixed inset-x-0 z-60 flex flex-col-reverse items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex max-w-full items-center gap-2 rounded-xl border border-line bg-background px-4 py-2 text-sm shadow-lg"
        >
          {toast.tone === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 text-accent" aria-hidden="true" />
          ) : toast.tone === "info" ? (
            <Info size={16} className="shrink-0 text-muted" aria-hidden="true" />
          ) : (
            <XCircle size={16} className="shrink-0 text-danger" aria-hidden="true" />
          )}
          <span className="min-w-0">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
