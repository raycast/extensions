import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { type Paper } from "./paper-utils";
import { getPaperStateKey } from "./read-utils";

export function useAutoRead(
  paper: Paper | undefined,
  ready: boolean,
  isRead: (paper: Paper) => boolean,
  markAsRead: (paper: Paper) => Promise<void>,
  markAsUnread: (paper: Paper) => Promise<void>,
) {
  const latest = useRef({ paper, isRead, markAsRead, markAsUnread });
  latest.current = { paper, isRead, markAsRead, markAsUnread };
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const key = paper ? getPaperStateKey(paper) : undefined;
  const manualSelection = useRef<string | undefined>(undefined);

  useEffect(() => {
    manualSelection.current = undefined;
  }, [key]);

  useEffect(() => {
    const selected = latest.current.paper;
    if (!ready || !selected || manualSelection.current === key || latest.current.isRead(selected)) return;
    timer.current = setTimeout(() => {
      if (latest.current.isRead(selected)) return;
      void latest.current.markAsRead(selected).catch((error: unknown) => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Could not save reading state",
          message: error instanceof Error ? error.message : undefined,
        });
      });
    }, 5000);
    return () => clearTimeout(timer.current);
  }, [key, ready]);

  // Preserve the manual choice across storage reloads until selection changes.
  return {
    markAsRead: (item: Paper) => {
      manualSelection.current = getPaperStateKey(item);
      clearTimeout(timer.current);
      return latest.current.markAsRead(item);
    },
    markAsUnread: (item: Paper) => {
      manualSelection.current = getPaperStateKey(item);
      clearTimeout(timer.current);
      return latest.current.markAsUnread(item);
    },
  };
}
