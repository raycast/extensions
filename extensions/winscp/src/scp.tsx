import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ErrorView } from "./components/ErrorView";
import { useWinSCP } from "./hooks/useWinSCP";
import { formatSessionTarget } from "./winscp/parse";

export default function Command() {
  const { data, error, isLoading, revalidate, launch } = useWinSCP();

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      <List.EmptyView
        icon={Icon.HardDrive}
        title="No Sessions Found"
        description="Save a site in WinSCP and it will show up here."
      />
      <List.Section title="WinSCP Sessions" subtitle={data.length.toString()}>
        {data.map((session) => (
          <List.Item
            key={session.id}
            title={session.name}
            subtitle={formatSessionTarget(session)}
            icon={session.isWorkspace ? Icon.Window : Icon.HardDrive}
            actions={
              <ActionPanel>
                <Action title="Launch Session" icon={Icon.Play} onAction={() => launch(session)} />
                <Action
                  title="Launch in New Instance"
                  icon={Icon.PlusCircle}
                  onAction={() => launch(session, true)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                />
                <Action
                  title="Refresh Sessions"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
