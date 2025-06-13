import { Action, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  checkStatus: () => void;
}

export function FetchBranch({ checkStatus }: Props) {
  const { value } = useRepo();
  const { revalidate } = useExec("git", ["fetch"], {
    cwd: value,
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
