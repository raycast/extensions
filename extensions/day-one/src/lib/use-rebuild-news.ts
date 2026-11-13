import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { failToast } from "./feedback";
import { plural } from "./parse";
import { RebuildStatus, takeRebuildNews } from "./sync";

/** Shows the result of a background search-index rebuild that finished while no one was looking. */
export function announceRebuild(status?: RebuildStatus): void {
  const news = takeRebuildNews(status);
  if (news?.state === "done") {
    void showToast({
      style: Toast.Style.Success,
      title: "Search Index Rebuilt",
      message: `${plural(news.recalculated, "entry", "entries")} can be found by meaning`,
    });
  } else if (news?.state === "failed") {
    void failToast(news.error, "Search Index Rebuild Failed");
  }
}

/** Checks once when a command opens. */
export function useRebuildNews(): void {
  useEffect(() => announceRebuild(), []);
}
