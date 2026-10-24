import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { rows } from "./lib/model";
import { list, PortcheckError } from "./lib/portcheck";
import { binary, PreferencesAction } from "./lib/raycast";
import { stopProcess } from "./stop";

export default function SearchPorts() {
  const { data, isLoading, error, revalidate } = usePromise(async () => rows(await list(binary())));

  if (error) {
    const missing = error instanceof PortcheckError && error.missing;
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={missing ? "portcheck isn't installed" : "portcheck failed"}
          description={error.message}
          actions={
            <ActionPanel>
              {missing && (
                <Action.CopyToClipboard
                  title="Copy Install Command"
                  content="brew install roystondwork-dev/tap/portcheck"
                />
              )}
              <PreferencesAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by port, process or user">
      <List.EmptyView icon={Icon.Plug} title="Nothing is listening" />
      {data?.map((r) => (
        <List.Item
          key={r.id}
          icon={{ source: Icon.Plug, tintColor: r.pid === undefined ? Color.SecondaryText : Color.Green }}
          title={`:${r.port}`}
          subtitle={r.name}
          keywords={[String(r.port), r.name, r.user ?? "", r.proto]}
          accessories={[
            ...(r.startedBy
              ? [{ text: `← ${r.startedBy.split(" ← ")[0]}`, tooltip: `Started by ${r.startedBy}` }]
              : []),
            ...(r.user ? [{ icon: Icon.Person, text: r.user }] : []),
            { tag: r.proto },
            ...(r.pid !== undefined ? [{ text: `pid ${r.pid}` }] : []),
          ]}
          actions={
            <ActionPanel>
              {r.pid !== undefined && (
                <Action
                  title={`Stop ${r.name}`}
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (await stopProcess(r.pid!, r.name)) revalidate();
                  }}
                />
              )}
              {r.stopHint && <Action.CopyToClipboard title="Copy Stop Command" content={r.stopHint} />}
              <Action.OpenInBrowser url={r.url} shortcut={Keyboard.Shortcut.Common.Open} />
              {r.pid !== undefined && (
                <Action.CopyToClipboard
                  title="Copy PID"
                  content={String(r.pid)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              )}
              {r.cmdline && <Action.CopyToClipboard title="Copy Command Line" content={r.cmdline} />}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
