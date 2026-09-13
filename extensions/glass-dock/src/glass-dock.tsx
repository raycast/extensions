import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  ContainerSummary,
  ControlSnapshot,
  loadContainerLogs,
  loadSnapshot,
  loadSupportReport,
  runAction,
} from "./control";

export default function GlassDock() {
  const { data, error, isLoading, revalidate } = usePromise(loadSnapshot);

  const perform = async (arguments_: string[], subject: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${subject}`,
    });
    try {
      const result = await runAction(arguments_);
      if (!result.succeeded) {
        toast.style = Toast.Style.Failure;
        toast.title = `${subject} action failed`;
        toast.message = result.message;
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = result.message;
      await revalidate();
    } catch (actionError) {
      toast.style = Toast.Style.Failure;
      toast.title = `${subject} action failed`;
      toast.message =
        actionError instanceof Error
          ? actionError.message
          : String(actionError);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Glass Dock and containers"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Cannot load Glass Dock"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : data ? (
        <>
          <List.Section title="Glass Dock">
            <List.Item
              icon={{
                source: data.daemon.healthy
                  ? Icon.CheckCircle
                  : Icon.ExclamationMark,
                tintColor: data.daemon.healthy ? Color.Green : Color.Red,
              }}
              title={`Status: ${capitalize(data.daemon.state)}`}
              subtitle={data.daemon.message}
              keywords={["health", "version", "socket", "docker", "api"]}
              accessories={[
                { text: data.daemon.version ?? "Version unavailable" },
                {
                  text: `${data.containers.filter((container) => container.state === "running").length} running`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Status"
                    icon={Icon.Gauge}
                    target={
                      <StatusDetail
                        snapshot={data}
                        perform={perform}
                        revalidate={revalidate}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Heartbeat}
              title="Diagnostics and Support Report"
              subtitle="Health, build, paths, disk space, and bounded logs"
              keywords={["support", "logs", "paths", "build", "commit"]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Diagnostics"
                    icon={Icon.Heartbeat}
                    target={<DiagnosticsDetail />}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title={`Containers (${data.containers.length})`}>
            {data.containers.map((container) => (
              <List.Item
                key={container.id}
                icon={{
                  source:
                    container.state === "running"
                      ? Icon.CircleFilled
                      : Icon.Circle,
                  tintColor:
                    container.state === "running"
                      ? Color.Green
                      : Color.SecondaryText,
                }}
                title={container.name}
                subtitle={container.image}
                keywords={[container.id, container.state, container.status]}
                accessories={[
                  { text: container.status },
                  { text: container.id.slice(0, 12), tooltip: container.id },
                ]}
                actions={
                  <ContainerActions
                    container={container}
                    perform={perform}
                    revalidate={revalidate}
                  />
                }
              />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

function StatusDetail({
  snapshot,
  perform,
  revalidate,
}: {
  snapshot: ControlSnapshot;
  perform: (arguments_: string[], subject: string) => Promise<void>;
  revalidate: () => Promise<unknown>;
}) {
  const running = snapshot.containers.filter(
    (container) => container.state === "running",
  ).length;
  const canMutateManagedDaemon = snapshot.daemon.managed && running === 0;
  return (
    <Detail
      navigationTitle="Glass Dock Status"
      markdown={`# Glass Dock ${snapshot.daemon.state}\n\n${snapshot.daemon.message ?? "The local Docker-compatible endpoint is available."}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Daemon health"
            text={{
              value: snapshot.daemon.healthy ? "Healthy" : "Unavailable",
              color: snapshot.daemon.healthy ? Color.Green : Color.Red,
            }}
          />
          <Detail.Metadata.Label
            title="VM health"
            text={snapshot.daemon.virtualMachineHealth ?? "Not reported"}
          />
          <Detail.Metadata.Label
            title="Version"
            text={snapshot.daemon.version ?? "Not reported"}
          />
          <Detail.Metadata.Label
            title="Docker API"
            text={snapshot.daemon.apiVersion ?? "Not reported"}
          />
          <Detail.Metadata.Label
            title="Socket"
            text={snapshot.daemon.socketPath}
          />
          <Detail.Metadata.Label
            title="Connectivity"
            text={snapshot.daemon.socketReachable ? "Connected" : "Unavailable"}
          />
          <Detail.Metadata.Label
            title="Control ownership"
            text={snapshot.diagnostics.ownership}
          />
          <Detail.Metadata.Label
            title="Containers"
            text={`${running} running, ${snapshot.containers.length} total`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          {snapshot.daemon.state === "stopped" ? (
            <Action
              title="Start Glass Dock"
              icon={Icon.Play}
              onAction={() => perform(["daemon", "start"], "Glass Dock")}
            />
          ) : canMutateManagedDaemon ? (
            <>
              <Action
                title="Restart Glass Dock"
                icon={Icon.Repeat}
                onAction={() => perform(["daemon", "restart"], "Glass Dock")}
              />
              <Action
                title="Stop Glass Dock"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={() => perform(["daemon", "stop"], "Glass Dock")}
              />
            </>
          ) : null}
          <Action.Push
            title="Open Diagnostics"
            icon={Icon.Heartbeat}
            target={<DiagnosticsDetail />}
          />
        </ActionPanel>
      }
    />
  );
}

function DiagnosticsDetail() {
  const { data, error, isLoading, revalidate } = usePromise(loadSupportReport);
  const snapshot = data?.snapshot;
  const reportText = error
    ? `Diagnostics unavailable: ${error.message}`
    : data?.text || "Collecting diagnostics…";
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Glass Dock Diagnostics"
      markdown={`# Support Report\n\n\`\`\`text\n${reportText.replaceAll("```", "` ` `")}\n\`\`\``}
      metadata={
        snapshot ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="State" text={snapshot.daemon.state} />
            <Detail.Metadata.Label
              title="Version"
              text={snapshot.daemon.version ?? "Not reported"}
            />
            <Detail.Metadata.Label
              title="Docker API"
              text={snapshot.daemon.apiVersion ?? "Not reported"}
            />
            <Detail.Metadata.Label
              title="Git commit"
              text={snapshot.daemon.gitCommit ?? "Not reported"}
            />
            <Detail.Metadata.Label
              title="Socket"
              text={snapshot.daemon.socketPath}
            />
            <Detail.Metadata.Label
              title="Ownership"
              text={snapshot.diagnostics.ownership}
            />
            <Detail.Metadata.Label
              title="Disk space"
              text={snapshot.diagnostics.diskSpace?.level ?? "Not available"}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action.CopyToClipboard
            title="Copy Support Report"
            content={reportText}
          />
          {snapshot ? (
            <Action
              title="Open Log Folder"
              icon={Icon.Folder}
              onAction={() => open(snapshot.diagnostics.paths.logDirectory)}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function ContainerActions({
  container,
  perform,
  revalidate,
}: {
  container: ContainerSummary;
  perform: (arguments_: string[], subject: string) => Promise<void>;
  revalidate: () => Promise<unknown>;
}) {
  const running = container.state === "running";
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {running ? (
          <Action
            title="Stop Container"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            onAction={() =>
              perform(["containers", "stop", container.id], "Container")
            }
          />
        ) : (
          <Action
            title="Start Container"
            icon={Icon.Play}
            onAction={() =>
              perform(["containers", "start", container.id], "Container")
            }
          />
        )}
        <Action.Push
          title="View Container Logs"
          icon={Icon.Terminal}
          target={<ContainerLogs container={container} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Container ID"
          content={container.id}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ContainerLogs({ container }: { container: ContainerSummary }) {
  const { data, error, isLoading, revalidate } = usePromise(loadContainerLogs, [
    container.id,
  ]);
  const text = error ? error.message : data?.text || "No logs are available.";
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${container.name} Logs`}
      markdown={`\`\`\`text\n${text.replaceAll("```", "` ` `")}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action.CopyToClipboard title="Copy Logs" content={text} />
        </ActionPanel>
      }
    />
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
