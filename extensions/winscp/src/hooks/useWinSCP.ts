import { showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import type { WinSCPSession } from "../types";
import { findWinSCPExe, launchSession, loadSessions } from "../winscp/winscp";

export function useWinSCP() {
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => loadSessions(findWinSCPExe()), [], {
    initialData: [],
    // The error is rendered by `ErrorView`, so don't also show a toast for it.
    onError: () => {},
  });

  const launch = async (session: WinSCPSession, newInstance = false) => {
    try {
      await launchSession(findWinSCPExe(), session, newInstance);
      await showToast({
        style: Toast.Style.Success,
        title: "Session Launched",
        message: `Starting ${session.name}`,
      });
    } catch (err) {
      await showFailureToast(err, { title: `Could not launch ${session.name}` });
    }
  };

  return { data, error, isLoading, revalidate, launch };
}
