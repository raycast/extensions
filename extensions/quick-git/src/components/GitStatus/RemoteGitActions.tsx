import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";

interface Props {
  repo: string;
  checkStatus: () => void;
}

export function RemoteGitActions({ repo, checkStatus }: Props) {
  const { revalidate: push } = useExec("git", ["push"], {
    cwd: repo,
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
  const { revalidate: pull } = useExec("git", ["pull"], {
    cwd: repo,
    execute: false,
    onWillExecute: () => {
      showToast({ title: "Pulling branch", style: Toast.Style.Animated });
    },
    onData: () => {
      checkStatus();
      showToast({ title: "Branch up to date" });
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not pull this branch" });
    },
  });
  const { revalidate: fetch } = useExec("git", ["fetch"], {
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

  return (
    <ActionPanel.Section title="Remote">
      <Action title="Push" onAction={push} icon={Icon.Upload} shortcut={Keyboard.Shortcut.Common.MoveUp} />
      <Action title="Pull" onAction={pull} icon={Icon.Download} shortcut={Keyboard.Shortcut.Common.MoveDown} />
      <Action title="Fetch" onAction={fetch} icon={Icon.ArrowClockwise} />
    </ActionPanel.Section>
  );
}
