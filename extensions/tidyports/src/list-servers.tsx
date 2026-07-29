import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  Listener,
  TidyPortsMissingError,
  isLikelyDevServer,
  killPort,
  listServers,
  provenance,
} from "./lib/cli";

const DOWNLOAD_URL = "https://tidyports.app/download";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(listServers);

  // The app is what provides the CLI, so "not installed" is the most likely first-run
  // state for anyone who finds this extension in the store rather than via the app.
  // Treat it as a call to action, not an error — this is where the funnel lives.
  if (error instanceof TidyPortsMissingError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="TidyPorts isn't installed"
          description="This extension reads from the TidyPorts app, which is free for macOS 15+. Press Enter to get it."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Download Tidyports"
                url={DOWNLOAD_URL}
              />
              <Action.CopyToClipboard
                title="Copy Homebrew Command"
                content="brew install --cask dan-fetch-studio/tap/tidyports"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Any other failure — the CLI timing out, exiting non-zero, or returning malformed
  // JSON — must not fall through to the list below, where `data ?? []` would render
  // "Nothing listening". For a tool whose whole job is telling you what is running, a
  // false "nothing" is worse than an error: it is the exact misdiagnosis this exists
  // to prevent.
  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't list your servers"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const dev = (data ?? []).filter(isLikelyDevServer);
  const other = (data ?? []).filter((l) => !isLikelyDevServer(l));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by port, project, branch or agent…"
    >
      <List.EmptyView
        icon={Icon.Check}
        title="Nothing listening"
        description="No local dev servers are running."
      />
      {/* Dev servers first. The rest of the machine's listeners — Docker, Figma,
          ControlCenter — are real but they are not what you came here for, so they sit
          below rather than being hidden outright. */}
      <List.Section
        title="Dev servers"
        subtitle={dev.length ? String(dev.length) : undefined}
      >
        {dev.map((l) => (
          <ServerItem
            key={`${l.port}-${l.pid}`}
            listener={l}
            onChanged={revalidate}
          />
        ))}
      </List.Section>
      <List.Section
        title="Other listeners"
        subtitle={other.length ? String(other.length) : undefined}
      >
        {other.map((l) => (
          <ServerItem
            key={`${l.port}-${l.pid}`}
            listener={l}
            onChanged={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ServerItem({
  listener,
  onChanged,
}: {
  listener: Listener;
  onChanged: () => void;
}) {
  const url = `http://localhost:${listener.port}`;
  const who = provenance(listener);
  const project = listener.gitRoot
    ? listener.gitRoot.split("/").pop()
    : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (listener.branch)
    accessories.push({
      tag: { value: listener.branch, color: Color.SecondaryText },
    });
  // Idle is the signal that decides whether a server is safe to close, so it earns a slot.
  if (listener.idle) accessories.push({ icon: Icon.Moon, tooltip: "Idle" });
  if (
    listener.exposed &&
    listener.exposedAddr &&
    listener.exposedAddr !== "127.0.0.1"
  ) {
    accessories.push({
      icon: { source: Icon.Globe, tintColor: Color.Orange },
      tooltip: `Reachable on ${listener.exposedAddr}`,
    });
  }

  return (
    <List.Item
      icon={listener.agent ? Icon.Stars : Icon.Terminal}
      title={`:${listener.port}`}
      // Provenance first, falling back to the process name — the whole point is that
      // "Claude Code, in Ghostty" beats "node".
      subtitle={who ?? listener.comm}
      keywords={
        [
          listener.comm,
          project,
          listener.branch,
          listener.agent,
          listener.surface,
        ].filter(Boolean) as string[]
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action
            title="Kill Server"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              // Always confirm. This signals a process the user did not start from here,
              // and the app's own kill path is confirm-first for the same reason.
              const ok = await confirmAlert({
                title: `Stop the server on :${listener.port}?`,
                message: who ? `Started by ${who}.` : listener.comm,
                primaryAction: {
                  title: "Stop Server",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (!ok) return;
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: `Stopping :${listener.port}…`,
              });
              try {
                await killPort(listener.port);
                toast.style = Toast.Style.Success;
                toast.title = `Stopped :${listener.port}`;
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = `Couldn't stop :${listener.port}`;
                toast.message = e instanceof Error ? e.message : undefined;
              }
              onChanged();
            }}
          />
          {project && (
            <Action
              title="Open Project Folder"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={() => open(listener.gitRoot)}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onChanged}
          />
        </ActionPanel>
      }
    />
  );
}
