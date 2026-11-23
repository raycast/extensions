import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import CleanCommand from "./clean";
import { folder, gb, openLink, status } from "./devbroom";

function ago(ms: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

function AppActions() {
  return (
    <>
      <Action.Push title="Scan and Choose What to Clean" icon={Icon.Trash} target={<CleanCommand />} />
      <Action title="Open Devbroom" icon={Icon.AppWindow} onAction={() => openLink("open", "storage")} />
    </>
  );
}

export default function Command() {
  const { data, isLoading, error } = usePromise(status);
  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Devbroom couldn't be asked"
          description={`${error.message}. Link the command in Devbroom: Settings, Integrations.`}
          actions={
            <ActionPanel>
              <Action title="Open Devbroom" onAction={() => openLink("open", "storage")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List isLoading={isLoading} navigationTitle={data ? `Scanned ${ago(data.at_ms)}` : "Devbroom"}>
      {data && (
        <List.Section title="Last scan">
          <List.Item
            icon={{ source: Icon.CheckCircle }}
            title="Ready to clean"
            subtitle={`${data.ready_items} items`}
            accessories={[{ text: gb(data.ready_bytes) }]}
            actions={
              <ActionPanel>
                <AppActions />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Eye}
            title="To review"
            subtitle={`${data.review_items} items`}
            accessories={[{ text: gb(data.review_bytes) }]}
            actions={
              <ActionPanel>
                <AppActions />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Lock}
            title="Blocked"
            accessories={[{ text: gb(data.blocked_bytes) }]}
            actions={
              <ActionPanel>
                <AppActions />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {data && data.top.length > 0 && (
        <List.Section title="Largest Ready items">
          {data.top.map((t) => (
            <List.Item
              key={t.path}
              icon={Icon.Folder}
              title={t.path.split("/").pop() ?? t.path}
              subtitle={folder(t.path)}
              accessories={[{ text: t.kind }, { text: gb(t.bytes) }]}
              actions={
                <ActionPanel>
                  <AppActions />
                  <Action.ShowInFinder path={t.path} />
                  <Action.CopyToClipboard title="Copy Path" content={t.path} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
