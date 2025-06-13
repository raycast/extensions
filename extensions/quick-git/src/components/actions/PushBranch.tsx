import { Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useRepo } from "../../hooks/useRepo.js";

interface Props {
  checkStatus: () => void;
}

export function PushBranch({ checkStatus }: Props) {
  const { value } = useRepo();

  const { revalidate: forcePush } = useExec("git", ["push", "--force-with-lease"], {
    cwd: value,
    execute: false,
    onWillExecute: () => {
      showToast({ title: "Pushing branch", style: Toast.Style.Animated });
    },
    onData: () => {
      checkStatus();
      showToast({ title: "Remote up to date" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not push this branch" });
    },
  });

  const { revalidate } = useExec("git", ["push"], {
    cwd: value,
    execute: false,
    onWillExecute: () => {
      showToast({ title: "Pushing branch", style: Toast.Style.Animated });
    },
    onData: () => {
      checkStatus();
      showToast({ title: "Remote up to date" });
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Could not push this branch",
        primaryAction: {
          onAction: forcePush,
          title: "Force push branch",
        },
      });
    },
  });

  return <Action title="Push" icon={Icon.Upload} onAction={revalidate} shortcut={Keyboard.Shortcut.Common.MoveUp} />;
}
