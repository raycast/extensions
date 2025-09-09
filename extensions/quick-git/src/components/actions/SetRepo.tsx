import { useMemo } from "react";
import { Action, Icon } from "@raycast/api";
import { launchSetRepo } from "../../utils/launchCommands.js";

interface Props {
  title?: string;
}

export function SetRepo({ title }: Props) {
  const actionTitle = useMemo(() => {
    return title || "Set Repo";
  }, [title]);

  return <Action title={actionTitle} icon={Icon.Folder} onAction={launchSetRepo} />;
}
