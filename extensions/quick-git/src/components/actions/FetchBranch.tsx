import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";
import { useCheckStatus } from "../../hooks/useCheckStatus.js";

export function FetchBranch() {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const { revalidate } = useExec("git", ["fetch"], {
    cwd: repo,
    execute: false,
    onWillExecute: () => {
      showToast({ title: "Fetching repo data", style: Toast.Style.Animated });
    },
    onData: () => {
      checkStatus();
      showToast({ title: "Fetched data" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not fetch data" });
    },
  });

  return <Action title="Fetch" icon={Icon.ArrowClockwise} onAction={revalidate} />;
}
