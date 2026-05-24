import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  BuildStatus,
  DroneStage,
  DroneStep,
  getBuild,
  getStepLogs,
} from "./drone";

const MAX_LOG_LINES = 500;

function statusIcon(status: BuildStatus): { source: Icon; tintColor: Color } {
  switch (status) {
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failure":
    case "error":
    case "killed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "declined":
    case "skipped":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case "running":
      return { source: Icon.CircleProgress, tintColor: Color.Yellow };
    case "pending":
    case "waiting_on_dependencies":
    case "blocked":
      return { source: Icon.Clock, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function fmtDur(start: number, end: number): string {
  if (!start) return "—";
  const finished = end || Math.floor(Date.now() / 1000);
  const sec = Math.max(0, finished - start);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function fmtTime(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString();
}

export function BuildDetailView({
  slug,
  number,
  fallbackLink,
}: {
  slug: string;
  number: number;
  fallbackLink?: string;
}) {
  const { data, isLoading, revalidate } = useCachedPromise(
    () => getBuild(slug, number),
    [],
    {
      onError: (err) => {
        showFailureToast(err, { title: `Failed to load ${slug} #${number}` });
      },
    },
  );
  const { push } = useNavigation();

  const stages = data?.stages ?? [];
  const link = data?.link ?? fallbackLink;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${slug} #${number}`}
      searchBarPlaceholder="Find a step…"
    >
      {data && (
        <List.Section title="Build">
          <List.Item
            icon={statusIcon(data.status)}
            title={`${data.status.toUpperCase()} · ${data.event}${data.target ? ` → ${data.target}` : ""}`}
            subtitle={(data.message || "").split("\n")[0]}
            accessories={[
              { text: fmtDur(data.started, data.finished) },
              { text: fmtTime(data.started) },
            ]}
            actions={
              <ActionPanel>
                {link ? <Action.OpenInBrowser url={link} /> : null}
                <Action
                  title="Reload"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {stages.map((stage) => (
        <List.Section
          key={stage.id}
          title={`Stage ${stage.number}: ${stage.name}${stage.os ? ` · ${stage.os}/${stage.arch}` : ""}`}
        >
          {(stage.steps ?? []).map((step) => (
            <List.Item
              key={step.id}
              icon={statusIcon(step.status)}
              title={step.name}
              subtitle={step.status}
              accessories={[
                step.exit_code !== undefined
                  ? { tag: `exit ${step.exit_code}` }
                  : { text: "" },
                { text: fmtDur(step.started, step.stopped) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="View Logs"
                    icon={Icon.Terminal}
                    onAction={() =>
                      push(
                        <StepLogsView
                          slug={slug}
                          build={number}
                          stage={stage}
                          step={step}
                          buildLink={link}
                        />,
                      )
                    }
                  />
                  {link ? (
                    <Action.OpenInBrowser
                      title="Open Build in Browser"
                      url={link}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  ) : null}
                  <Action
                    title="Reload"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && stages.length === 0 && (
        <List.EmptyView
          title="No stages yet"
          description="The build has no stages reported. Try Reload (⌘R) if it just started."
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}

function StepLogsView({
  slug,
  build,
  stage,
  step,
  buildLink,
}: {
  slug: string;
  build: number;
  stage: DroneStage;
  step: DroneStep;
  buildLink?: string;
}) {
  const { data, isLoading, revalidate } = useCachedPromise(
    () => getStepLogs(slug, build, stage.number, step.number),
    [],
    {
      onError: (err) => {
        showFailureToast(err, {
          title: `Failed to load logs for ${stage.name}/${step.name}`,
        });
      },
    },
  );

  const lines = data ?? [];
  const tail = lines.slice(-MAX_LOG_LINES);
  const truncated = lines.length > MAX_LOG_LINES;
  const raw = tail.map((l) => l.out.replace(/\n$/, "")).join("\n");

  const markdown = [
    `## ${slug} #${build}`,
    `### ${stage.name} → ${step.name}`,
    "",
    `**${step.status.toUpperCase()}**${step.exit_code !== undefined ? ` · exit ${step.exit_code}` : ""} · ${fmtDur(step.started, step.stopped)}`,
    "",
    truncated
      ? `_Showing last ${MAX_LOG_LINES} of ${lines.length} lines._`
      : "",
    "",
    "```",
    raw || "(no output)",
    "```",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={`${slug} #${build} · ${stage.name}/${step.name}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Full Log"
            content={lines.map((l) => l.out).join("")}
          />
          {buildLink ? (
            <Action.OpenInBrowser
              title="Open Build in Browser"
              url={buildLink}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          ) : null}
          <Action
            title="Reload"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
