import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getErrorMessage, omni, type DoctorReport } from "./lib/omni";

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    () => omni<DoctorReport>(["doctor"], 30000),
    [],
    { keepPreviousData: true },
  );

  const checks = data?.checks ?? [];
  const allOk = data?.ok ?? true;
  const passing = checks.filter((check) => check.ok);
  const failing = checks.filter((check) => !check.ok);

  const reRunAction = (
    <Action
      title="Re-run Doctor"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={revalidate}
    />
  );

  return (
    <List
      navigationTitle={`Omni Doctor — ${allOk ? "All Good" : "Issues Found"}`}
      searchBarPlaceholder="Search checks..."
      isLoading={isLoading}
    >
      {error && (
        <List.Item
          title="Doctor Error"
          subtitle={getErrorMessage(error)}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          actions={<ActionPanel>{reRunAction}</ActionPanel>}
        />
      )}

      {failing.length > 0 && (
        <List.Section title="Issues" subtitle={`${failing.length}`}>
          {failing.map((check) => (
            <List.Item
              key={check.name}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              title={check.name}
              subtitle={check.detail}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Detail"
                    content={`${check.name}: ${check.detail}`}
                  />
                  {reRunAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {passing.length > 0 && (
        <List.Section title="Passing" subtitle={`${passing.length}`}>
          {passing.map((check) => (
            <List.Item
              key={check.name}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              title={check.name}
              subtitle={check.detail}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Detail"
                    content={`${check.name}: ${check.detail}`}
                  />
                  {reRunAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!isLoading && !error && checks.length === 0 && (
        <List.EmptyView
          icon={Icon.Heartbeat}
          title="No Doctor Results"
          description="Run Omni Doctor to collect health checks."
          actions={<ActionPanel>{reRunAction}</ActionPanel>}
        />
      )}
    </List>
  );
}
