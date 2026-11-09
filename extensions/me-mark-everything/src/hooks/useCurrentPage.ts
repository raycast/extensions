/**
 * Current-page prefill for Save Bookmark. Wraps the existing, tested page
 * capture (JXA for Chrome/Edge/Arc) instead of the upstream Raindrop hook:
 * upstream only returns a URL, while this one also returns the page title,
 * maps Automation-permission failures to actionable text, and keeps the
 * form editable when a read fails.
 */
import { useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { createPageCapture } from "../current-page";
import type { CurrentPage } from "../page-capture";

export function useCurrentPage(enabled: boolean) {
  const reader = useRef<ReturnType<typeof createPageCapture> | undefined>(undefined);
  if (!reader.current) reader.current = createPageCapture();
  const [isLoading, setIsLoading] = useState(enabled);
  const [page, setPage] = useState<CurrentPage>();

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    reader.current!.read().then(
      (found) => {
        if (!active) return;
        setPage(found);
        setIsLoading(false);
      },
      (cause) => {
        if (!active) return;
        setIsLoading(false);
        void showToast({
          style: Toast.Style.Failure,
          title: "Current page not filled",
          message: cause instanceof Error ? cause.message : String(cause),
        });
      },
    );
    return () => {
      active = false;
      reader.current?.cancel();
    };
  }, [enabled]);

  return { isLoading, page };
}
