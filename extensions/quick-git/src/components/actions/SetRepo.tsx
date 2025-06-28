import { useMemo } from "react";
import { Action, Icon, launchCommand, LaunchType } from "@raycast/api";

interface Props {
  title?: string;
}

function launchSetRepo() {
  launchCommand({
    name: "set-repo",
    type: LaunchType.UserInitiated,
  });
}

export function SetRepo({ title }: Props) {
  const actionTitle = useMemo(() => {
    return title || "Set Repo";
  }, [title]);

  return <Action title={actionTitle} icon={Icon.Folder} onAction={launchSetRepo} />;
}
