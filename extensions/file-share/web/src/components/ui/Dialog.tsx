import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Dialog({
  open,
  onOpenChange,
  id,
  title,
  toolbar,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  title: string;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <RadixDialog.Content
          id={id}
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[min(44rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl",
            "border border-line bg-background p-5 text-ink shadow-2xl focus:outline-none",
            // Small screens scroll the dialog instead of pushing its own buttons out of reach.
            "themed-scroll max-h-[calc(100dvh-2rem)] overflow-y-auto",
            className,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-semibold">
                {title}
              </RadixDialog.Title>
              {/* Radix wants a description for screen readers; the dialog itself only shows the title. */}
              <RadixDialog.Description className="sr-only">
                {title}
              </RadixDialog.Description>
            </div>
            <div className="flex items-center gap-1.5">
              {toolbar}
              <RadixDialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface hover:text-ink sm:size-8"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </RadixDialog.Close>
            </div>
          </div>
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
