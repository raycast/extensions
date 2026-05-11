import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useWinSCP } from "./hooks/useWinSCP";
import { ErrorView } from "./components/ErrorView";

export default function Command() {
  const { data, error, isLoading, launchSession } = useWinSCP();

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions...">
      <List.Section title="WinSCP Sessions" subtitle={data.length.toString()}>
        {data.map((session) => (
          <List.Item
            key={`${session.name}-${session.user}@${session.host}`}
            title={session.name}
            subtitle={`${session.user}@${session.host}`}
            icon={Icon.HardDrive}
            actions={
              <ActionPanel>
                <Action title="Launch Session" icon={Icon.Play} onAction={() => launchSession(session)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
