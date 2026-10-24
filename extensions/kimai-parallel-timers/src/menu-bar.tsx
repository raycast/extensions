import {
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { client, perform } from "./shared";
import { duration, nameOf } from "./api";
import { periodStarts, timeSummary } from "./summary";
import { groupRecent } from "./recents";
export default function Command() {
  const api = client();
  const { data, isLoading, revalidate, error } = usePromise(async () => {
    const [active, recent] = await Promise.all([api.active(), api.history()]);
    return { active, recent };
  }, []);
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    revalidate: refreshSummary,
  } = usePromise(async () => {
    const now = new Date();
    const starts = periodStarts(now);
    const since = new Date(
      Math.min(starts.week.getTime(), starts.month.getTime()),
    );
    const [history, running] = await Promise.all([
      api.historySince(since),
      api.active(),
    ]);
    return timeSummary([...history, ...running], now);
  }, []);
  const refresh = async () => {
    await Promise.all([revalidate(), refreshSummary()]);
  };
  const active = data?.active ?? [];
  return (
    <MenuBarExtra
      icon={error ? Icon.ExclamationMark : "extension-icon.png"}
      title={
        active.length
          ? active
              .map((e) => {
                const label = e.description || nameOf(e.project);
                const characters = Array.from(label);
                const shortLabel =
                  characters.length > 15
                    ? `${characters.slice(0, 15).join("")}...`
                    : label;
                return `${shortLabel}: ${duration(e).replace(/h (\d+)m$/, ":$1")}`;
              })
              .join(" · ")
          : undefined
      }
      tooltip={
        error?.message ??
        active
          .map((e) => `${e.description || nameOf(e.project)}: ${duration(e)}`)
          .join("\n")
      }
      isLoading={isLoading || summaryLoading}
    >
      {error && (
        <MenuBarExtra.Item
          title="Connection failed — open settings"
          onAction={() =>
            launchCommand({
              name: "connection",
              type: LaunchType.UserInitiated,
            })
          }
        />
      )}
      <MenuBarExtra.Section title={`Running (${active.length})`}>
        {active.map((e) => (
          <MenuBarExtra.Item
            key={e.id}
            title={`${e.description || nameOf(e.project)} · ${duration(e)}`}
            subtitle={nameOf(e.project)}
            icon={Icon.Stop}
            onAction={() =>
              perform(
                `timer:stop:${e.id}`,
                "Stop timer",
                () => api.stop(e.id),
                refresh,
              )
            }
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Start New Timer…"
        icon={Icon.Plus}
        onAction={() =>
          launchCommand({
            name: "create-timer",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <MenuBarExtra.Item
        title="Manage Timers…"
        onAction={() =>
          launchCommand({ name: "index", type: LaunchType.UserInitiated })
        }
      />
      {active.length > 0 && (
        <MenuBarExtra.Item
          title={`Stop All ${active.length} Timers`}
          icon={Icon.Stop}
          onAction={() =>
            perform(
              "timer:stop-all",
              "Stop all timers",
              () => api.stopAll(),
              refresh,
            )
          }
        />
      )}
      <MenuBarExtra.Section title="Resume recent">
        {groupRecent(data?.recent ?? [])
          .slice(0, 10)
          .map(({ entry: e, count }) => (
            <MenuBarExtra.Item
              key={e.id}
              title={`${count > 1 ? `(${count}) ` : ""}${e.description || nameOf(e.project)}`}
              subtitle={nameOf(e.project)}
              icon={Icon.Play}
              onAction={() =>
                perform(
                  `timer:resume:${e.id}`,
                  "Resume timer",
                  () => api.resume(e),
                  refresh,
                )
              }
            />
          ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title="Refresh" onAction={refresh} />
      <MenuBarExtra.Item title="Open Kimai" onAction={() => open(api.base)} />
      <MenuBarExtra.Section title="Summary · hours:minutes">
        {summaryError ? (
          <MenuBarExtra.Item
            title="Could not load summary — refresh"
            onAction={refresh}
          />
        ) : summary ? (
          <>
            <MenuBarExtra.Item title={`Today: ${summary.today}`} />
            <MenuBarExtra.Item title={`This week: ${summary.week}`} />
            <MenuBarExtra.Item title={`This month: ${summary.month}`} />
          </>
        ) : (
          <MenuBarExtra.Item title="Loading summary…" />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
