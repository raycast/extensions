import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchProps,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { bytes, entities, markdownText } from "./model";
import {
  configureInactivity,
  IdleInstance,
  IdleStatus,
  inactivity,
  notifications,
} from "./inactivity";
import { ResourceRow, useLive } from "./ui";

function CandidateDetails({
  instance,
  name,
}: {
  instance?: IdleInstance;
  name: string;
}) {
  const live = useLive();
  const target = instance?.target;
  const row =
    live.snapshot && target && live.snapshot.boot === target.boot
      ? entities(live.snapshot, live.previous).find(
          (entity) =>
            entity.target?.pid === target.target.pid &&
            entity.target.start === target.target.start &&
            entity.target.executable === target.target.executable &&
            entity.kind ===
              (target.members.length > 1 ||
              target.target.pid === target.target.appPid
                ? "app"
                : "process"),
        )
      : undefined;
  return (
    <List isLoading={!live.snapshot && !live.error} navigationTitle={name}>
      <List.Item
        title={
          row
            ? "Appears inactive — review before closing"
            : "Original target is no longer available"
        }
        subtitle={live.error ?? "Opening details never closes anything"}
      />
      {row && live.snapshot && (
        <ResourceRow entity={row} snapshot={live.snapshot} />
      )}
    </List>
  );
}
export default function Inactive({
  launchContext,
}: LaunchProps<{ launchContext?: { noticeID?: string } }>) {
  const [status, setStatus] = useState<IdleStatus>(),
    [authorized, setAuthorized] = useState<boolean>(),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setStatus(await inactivity("status"));
      setAuthorized((await notifications("status")).authorized);
      setError(undefined);
    } catch (e) {
      setError(String(e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update inactivity monitoring",
        message: String(e),
      });
    } finally {
      setBusy(false);
    }
  }
  const state = status?.state;
  const notice = state?.notices.find(
    (value) => value.id === launchContext?.noticeID,
  );
  const instances = Object.entries(state?.instances ?? {}).sort(
    ([, a], [, b]) => b.quietSeconds - a.quietSeconds,
  );
  const actions = (
    <ActionPanel>
      <Action
        title="Choose Programs to Watch"
        icon={Icon.MagnifyingGlass}
        onAction={() =>
          launchCommand({ name: "inspect", type: LaunchType.UserInitiated })
        }
      />
      <Action
        title={
          state?.enabled
            ? "Disable Inactivity Alerts"
            : "Enable Inactivity Alerts"
        }
        icon={Icon.Bell}
        onAction={() =>
          perform(async () => {
            if (!state?.enabled) {
              const permission = await notifications("permission");
              if (!permission.authorized)
                throw new Error(
                  "Allow Resource Inspector Notifications in macOS System Settings → Notifications, then enable alerts again.",
                );
            }
            await configureInactivity({ enabled: !state?.enabled });
          })
        }
      />
      <Action
        title={`Set Threshold to ${state?.thresholdSeconds === 7200 ? "3" : "2"} Hours`}
        icon={Icon.Clock}
        onAction={() =>
          perform(() =>
            configureInactivity({
              thresholdSeconds: state?.thresholdSeconds === 7200 ? 10800 : 7200,
            }),
          )
        }
      />
      <Action
        title="Refresh Status"
        icon={Icon.ArrowClockwise}
        onAction={refresh}
      />
      <Action.OpenInBrowser
        title="Open Notification Settings"
        url="x-apple.systempreferences:com.apple.Notifications-Settings.extension"
      />
    </ActionPanel>
  );
  return (
    <List
      isLoading={busy || (!status && !error)}
      navigationTitle="Inactive Resources"
      searchBarPlaceholder="Search watched programs and results"
    >
      <List.Section
        title={
          state?.enabled
            ? status?.paused
              ? "Alerts paused with recording"
              : "Inactivity alerts enabled"
            : "Inactivity alerts disabled"
        }
        subtitle={`${(state?.thresholdSeconds ?? 10800) / 3600} hours · chosen programs only`}
      >
        <List.Item
          title="Inactivity Settings"
          subtitle={
            authorized
              ? "Notifications allowed · Force Quit only after you click"
              : "Notification permission required to enable alerts"
          }
          icon={Icon.Gear}
          actions={actions}
        />
        {error && (
          <List.Item
            title="Monitoring unavailable"
            subtitle={error}
            icon={Icon.ExclamationMark}
            actions={actions}
          />
        )}
        <List.Item
          title="How Inactivity Is Detected"
          subtitle="Low CPU and disk use do not prove a program is unneeded"
          icon={Icon.Info}
          actions={
            <ActionPanel>
              <Action.Push
                title="Read Details"
                target={
                  <Detail
                    markdown={`# Inactivity alerts\n\nChoose **Watch for Inactivity** in an app or standalone process's details. Future instances of that program are watched too.\n\nA target must stay below 1% of one CPU core and 64 KiB/s combined disk reads/writes, with its owning app not foreground at either sample, for ${state ? state.thresholdSeconds / 3600 : 3} observed hours. Missing counters, membership changes, activity, sleep, restarts, and recording gaps reset progress.\n\nNetwork activity and use between samples are not fully observed. Notifications mean **appears inactive**, not safe to discard.\n\nClicking **Force Quit** immediately terminates the one named target without another confirmation. Unsaved work may be lost. Ignoring a notification does nothing.\n\nRecording must be enabled and Raycast's Background Refresh must be running. One notification is sent per inactivity episode, at most once every five minutes across all candidates.\n\nmacOS may suppress banners through Focus or notification settings. Candidates remain listed here.`}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {notice && (
        <List.Section title="Opened from notification">
          <List.Item
            title={notice.name}
            subtitle={`Notification: ${notice.status}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Review Original Target"
                  target={
                    <CandidateDetails
                      instance={state?.instances[notice.instanceKey]}
                      name={notice.name}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section
        title="Observed Instances"
        subtitle="Missing or stale observations never count toward inactivity"
      >
        {instances.map(([key, instance]) => {
          const rule = state?.rules.find(
            (value) => value.id === instance.target.ruleID,
          );
          const stale = Date.now() / 1000 - instance.timestamp > 120;
          const memory = instance.target.members.every((p) => p.memory != null)
            ? instance.target.members.reduce((sum, p) => sum + p.memory!, 0)
            : null;
          return (
            <List.Item
              key={key}
              title={rule?.name ?? instance.target.target.name}
              subtitle={`PID ${instance.target.target.pid} · ${bytes(memory)}`}
              accessories={[
                {
                  text: stale
                    ? "Awaiting fresh observations"
                    : instance.quietSeconds >=
                        (state?.thresholdSeconds ?? 10800)
                      ? "Appears inactive"
                      : `${Math.floor(instance.quietSeconds / 60)} min observed quiet`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Review Target"
                    target={
                      <CandidateDetails
                        instance={instance}
                        name={rule?.name ?? instance.target.target.name}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section
        title="Watched Programs"
        subtitle="Add programs from Inspect Resources → target details"
      >
        {state?.rules.map((rule) => (
          <List.Item
            key={rule.id}
            title={rule.name}
            subtitle={rule.appPath ?? rule.executable}
            icon={rule.kind === "app" ? Icon.AppWindow : Icon.Gear}
            actions={
              <ActionPanel>
                <Action
                  title="Remove Watch"
                  icon={Icon.Minus}
                  onAction={() =>
                    perform(async () => {
                      await inactivity("remove", { id: rule.id });
                      await notifications("reconcile");
                    })
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section
        title="Recent Results"
        subtitle="Kept locally for seven days"
      >
        {state?.outcomes
          .slice()
          .reverse()
          .map((outcome) => (
            <List.Item
              key={outcome.id}
              title={outcome.name}
              subtitle={outcome.message}
              accessories={[{ date: new Date(outcome.time * 1000) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Read Result"
                    target={
                      <Detail
                        markdown={`# ${markdownText(outcome.name)}\n\n${markdownText(outcome.message)}\n\n${new Date(outcome.time * 1000).toLocaleString()}`}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
