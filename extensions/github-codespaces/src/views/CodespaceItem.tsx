import { Icon, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { match, P } from "ts-pattern";
import CodespaceActions from "../actions/CodespaceActions";
import { Codespace } from "../types";

interface CodespaceItemProps {
  codespace: Codespace;
  onRevalidate: () => void;
}
const CodespaceItem = ({ codespace, onRevalidate }: CodespaceItemProps) => {
  const gitStatus = {
    icon: Icon.ArrowUp,
    text: `${codespace.git_status.ahead}${
      codespace.git_status.has_uncommitted_changes ? "+" : ""
    }`,
    tooltip: codespace.git_status.has_uncommitted_changes
      ? codespace.git_status.ahead
        ? `You have ${codespace.git_status.ahead} unpushed commits as well as other uncommitted changes`
        : `You have uncommitted changes`
      : codespace.git_status.has_unpushed_changes
      ? `You have ${codespace.git_status.ahead} unpushed commits`
      : undefined,
  };
  return (
    <List.Item
      icon={match(codespace.state)
        .with(P.union("Unknown"), () => Icon.QuestionMarkCircle)
        .with(
          P.union(
            "Queued",
            "Provisioning",
            "Awaiting",
            "Moved",
            "ShuttingDown",
            "Exporting",
            "Updating",
            "Rebuilding"
          ),
          () => Icon.Clock
        )
        .with(P.union("Available", "Created", "Starting", "Shutdown"), () =>
          getAvatarIcon(`${codespace.repository.name.toUpperCase()}`)
        )
        .with(
          P.union("Unavailable", "Deleted", "Archived", "Failed"),
          () => Icon.XMarkCircle
        )
        .exhaustive()}
      title={codespace.display_name || codespace.name}
      keywords={[
        `${codespace.repository.owner.login}/${codespace.repository.name}`,
        codespace.name,
        codespace.repository.name,
        codespace.git_status.ref || "",
      ]}
      subtitle={`${codespace.repository.owner.login}/${codespace.repository.name} • ${codespace.git_status.ref}`}
      accessories={[
        gitStatus,
        {
          icon: Icon.ComputerChip,
          tooltip: codespace.machine?.display_name,
          text: `${codespace.machine?.cpus}-core`,
        },
        codespace.state === "Available"
          ? {
              icon: {
                source: Icon.Dot,
                tintColor: "green",
              },
              text: "Active",
            }
          : {
              date: new Date(codespace.last_used_at),
              tooltip: `Last used at: ${new Date(
                codespace.last_used_at
              ).toLocaleString()}`,
            },
      ]}
      actions={
        <CodespaceActions codespace={codespace} onRevalidate={onRevalidate} />
      }
    />
  );
};
export default CodespaceItem;
