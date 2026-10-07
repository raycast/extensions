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

  useEffect(() => {
    const selected = latest.current.paper;
    if (!ready || !selected || latest.current.isRead(selected)) return;
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

  // A manual choice must not be reversed by an already scheduled auto-read timer.
  return {
    markAsRead: (item: Paper) => {
      clearTimeout(timer.current);
      return latest.current.markAsRead(item);
    },
    markAsUnread: (item: Paper) => {
      clearTimeout(timer.current);
      return latest.current.markAsUnread(item);
    },
  };
}
