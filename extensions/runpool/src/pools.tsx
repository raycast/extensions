import { Action, ActionPanel, Color, Icon, Keyboard, List, confirmAlert, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NotInstalled } from "./components/NotInstalled";
import { PoolDetail } from "./components/PoolDetail";
import { useStatus } from "./hooks/useStatus";
import { isUnreachable, Pool, runpool, Status } from "./lib/runpool";

/**
 * Colour carries the state, so the list is readable at a glance.
 *
 * Resting is grey rather than red on purpose: on-demand pools are *supposed*
 * to be down most of the time, and colouring the normal state as a problem
 * trains people to ignore the colour.
 */
function accessory(pool: Pool, paused: boolean): List.Item.Accessory {
  if (paused) return { tag: { value: "Paused", color: Color.Orange }, tooltip: "runpool is paused" };
  if (isUnreachable(pool)) {
    return {
      tag: { value: "Unreachable", color: Color.Red },
      tooltip: "GitHub has no online runners for this pool, so jobs will queue forever. Re-register it.",
    };
  }
  if (pool.busy > 0) {
    return {
      tag: { value: `${pool.busy} building`, color: Color.Green },
      tooltip: `${pool.busy} job${pool.busy === 1 ? "" : "s"} in flight`,
    };
  }
  if (pool.running > 0) {
    return { tag: { value: "Idle", color: Color.Blue }, tooltip: "Runners are up but nothing is running" };
  }
  return { tag: { value: "Resting", color: Color.SecondaryText }, tooltip: "Down until a job queues. This is normal." };
}

function subtitle(pool: Pool): string {
  const local = `${pool.running}/${pool.count} up`;
  if (pool.github_registered === null) return local;
  return `${local} · github ${pool.github_online}/${pool.github_registered}`;
}

export default function Command() {
  const { status, isLoading, hasFetched, installed, revalidate } = useStatus();

  if (!installed) return <NotInstalled />;

  async function act(action: () => Promise<unknown>, pending: string, done: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: pending });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = done;
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: pending.replace(/…$/, "") + " failed" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter pools">
      {status?.pools.map((pool) => (
        <List.Item
          key={pool.name}
          icon={pool.scope === "org" ? Icon.TwoPeople : Icon.Person}
          title={pool.name}
          subtitle={subtitle(pool)}
          accessories={[{ text: pool.target }, accessory(pool, status.paused)]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Show Repositories"
                  icon={Icon.List}
                  target={<PoolDetail pool={pool} />}
                  // A repo pool serves exactly one repository, so opening
                  // GitHub directly is more useful than a list of one.
                />
                {pool.running === 0 ? (
                  <Action
                    title="Start Pool"
                    icon={Icon.Play}
                    onAction={() => act(() => runpool(["up", pool.name]), "Starting…", `${pool.name} started`)}
                  />
                ) : (
                  <Action
                    title="Stop Pool"
                    icon={Icon.Stop}
                    onAction={async () => {
                      // runpool refuses while a job is running rather than
                      // killing it. Say so up front instead of letting the
                      // command fail with a message nobody expected.
                      if (pool.busy > 0) {
                        const go = await confirmAlert({
                          title: `${pool.name} has ${pool.busy} job${pool.busy === 1 ? "" : "s"} running`,
                          message: "runpool will refuse to stop it. Wait for the jobs to finish, then try again.",
                          primaryAction: { title: "Try Anyway" },
                        });
                        if (!go) return;
                      }
                      act(() => runpool(["down", pool.name]), "Stopping…", `${pool.name} stopped`);
                    }}
                  />
                )}
              </ActionPanel.Section>

              <ActionPanel.Section title="Capacity">
                {[2, 4, 6, 8]
                  .filter((n) => n !== pool.count)
                  .map((n) => (
                    <Action
                      key={n}
                      title={`Set to ${n} Runners`}
                      icon={Icon.Gauge}
                      onAction={() =>
                        act(
                          () => runpool(["set-count", pool.name, String(n)]),
                          `Resizing to ${n}…`,
                          `${pool.name} now has ${n} runners`,
                        )
                      }
                    />
                  ))}
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
                <Action
                  title={status.paused ? "Resume Local CI" : "Pause Local CI"}
                  icon={status.paused ? Icon.Play : Icon.Pause}
                  onAction={() =>
                    act(
                      () => runpool([status.paused ? "resume" : "pause"]),
                      status.paused ? "Resuming…" : "Pausing…",
                      status.paused ? "Resumed" : "Paused, all runners down",
                    )
                  }
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
                {isUnreachable(pool) && (
                  <Action
                    title="Re-Register with GitHub"
                    icon={Icon.Repeat}
                    style={Action.Style.Destructive}
                    onAction={() =>
                      act(() => runpool(["reregister", pool.name]), "Re-registering…", `${pool.name} re-registered`)
                    }
                  />
                )}
                <Action
                  title="Open Log"
                  icon={Icon.Document}
                  onAction={() => open((status as Status).paths.log)}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}

      {/* Two empty states, not one. Without the hasFetched split, the "no pools"
          message flashes up before the first result arrives and reads as if
          nothing is configured. */}
      {!hasFetched && <List.EmptyView icon={Icon.Clock} title="Reading Pools" />}
      {hasFetched && status?.pools.length === 0 && (
        <List.EmptyView
          icon={Icon.Plus}
          title="No Pools Yet"
          description="Create one with: runpool register <name> --repo OWNER/REPO"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Register Command"
                content="runpool register my-pool --repo OWNER/REPO"
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
