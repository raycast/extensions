import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  confirmAlert,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NotInstalled } from "./components/NotInstalled";
import { PoolDetail } from "./components/PoolDetail";
import { useStatus } from "./hooks/useStatus";
import {
  errorMessage,
  fraction,
  getStatus,
  isUnreachable,
  ownerAvatar,
  Pool,
  poolState,
  runpool,
  stateLabel,
  Status,
} from "./lib/runpool";

/**
 * Colour carries the state.
 *
 * Offline is grey rather than red on purpose. It is GitHub's word for a runner
 * that is not connected, which for an on-demand pool is most of the time and is
 * the intended resting state. Colouring the normal case as a problem trains
 * people to ignore the colour, and then the one that matters gets ignored too.
 */
function stateColor(pool: Pool, paused: boolean): Color {
  switch (poolState(pool, paused)) {
    case "unreachable":
      return Color.Red;
    case "active":
      return Color.Green;
    case "idle":
      return Color.Blue;
    case "paused":
      return Color.Orange;
    case "offline":
      return Color.SecondaryText;
  }
}

export default function Command() {
  const { status, isLoading, hasFetched, installed, error, revalidate } = useStatus();

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
      await showFailureToast(error, { title: `${pending.replace(/…$/, "")} failed` });
    }
  }

  async function setPoolCount(pool: Pool, count: number) {
    try {
      // Capacity can be changed outside this view. Refresh before deciding
      // whether this selection deregisters runners, rather than trusting the
      // count captured when the list row rendered.
      const current = (await getStatus({ local: true })).pools.find((candidate) => candidate.name === pool.name);
      if (!current) throw new Error(`Pool "${pool.name}" no longer exists.`);

      if (count < current.count) {
        const confirmed = await confirmAlert({
          title: `Reduce ${pool.name} to ${count} runners?`,
          message:
            "The surplus runners are deregistered from GitHub, not just stopped. Growing the pool again registers new ones.",
          primaryAction: { title: "Reduce", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      await act(
        () => runpool(["set-count", pool.name, String(count)]),
        `Resizing to ${count}…`,
        `${pool.name} now has ${count} runners`,
      );
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Read Current Pool Capacity" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter pools">
      {status?.pools.map((pool) => (
        <List.Item
          key={pool.name}
          // The owner's GitHub avatar, falling back to a glyph if it cannot be
          // fetched, so a network blip never leaves a blank row.
          icon={{
            source: ownerAvatar(pool),
            fallback: pool.scope === "org" ? Icon.TwoPeople : Icon.Person,
            // Softened corners. A square photograph at this size looks pasted
            // in next to Raycast's own rounded iconography.
            mask: Image.Mask.RoundedRectangle,
          }}
          title={pool.name}
          subtitle={fraction(pool)}
          accessories={[
            { text: pool.target },
            {
              tag: { value: stateLabel(pool, status.paused), color: stateColor(pool, status.paused) },
              tooltip:
                poolState(pool, status.paused) === "paused"
                  ? status.paused
                    ? "All RunPool pools are globally paused. Use Manage Runner Pools to resume them."
                    : "This pool is paused and will not wake until it is resumed."
                  : poolState(pool, status.paused) === "offline"
                    ? "No runners connected. Normal for an on-demand pool; it wakes when a job queues."
                    : poolState(pool, status.paused) === "unreachable"
                      ? "GitHub has no online runners for this pool, so jobs will queue forever."
                      : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push title="Show Repositories" icon={Icon.List} target={<PoolDetail pool={pool} />} />
                {!status.paused && !pool.paused && pool.running === 0 ? (
                  <Action
                    title="Start Pool"
                    icon={Icon.Play}
                    onAction={() => act(() => runpool(["up", pool.name]), "Starting…", `${pool.name} started`)}
                  />
                ) : !pool.paused && !status.paused ? (
                  <Action
                    title="Stop Pool"
                    icon={Icon.Stop}
                    onAction={async () => {
                      // runpool refuses while a job is in flight rather than
                      // killing it. Say so first, instead of letting the command
                      // fail with a message nobody was expecting.
                      if (pool.busy > 0) {
                        const go = await confirmAlert({
                          title: `${pool.name} is running ${pool.busy} ${pool.busy === 1 ? "job" : "jobs"}`,
                          message: "runpool will refuse to stop it. Wait for the jobs to finish, then try again.",
                          primaryAction: { title: "Try Anyway" },
                        });
                        if (!go) return;
                      }
                      act(() => runpool(["down", pool.name]), "Stopping…", `${pool.name} stopped`);
                    }}
                  />
                ) : null}
                {!status.paused &&
                  (pool.paused ? (
                    <Action
                      title="Resume Pool"
                      icon={Icon.Play}
                      onAction={() =>
                        act(() => runpool(["resume", pool.name]), "Resuming…", `${pool.name} resumes on demand`)
                      }
                    />
                  ) : (
                    <Action
                      title="Pause Pool"
                      icon={Icon.Pause}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: `Pause ${pool.name}?`,
                          message:
                            "Its runners will stand down and this pool will stop waking for queued work. Other RunPool pools are unchanged.",
                          primaryAction: { title: "Pause Pool", style: Alert.ActionStyle.Destructive },
                        });
                        if (!confirmed) return;
                        act(() => runpool(["pause", pool.name]), "Pausing…", `${pool.name} paused`);
                      }}
                    />
                  ))}
                {isUnreachable(pool) && (
                  <Action
                    title="Re-Register with GitHub"
                    icon={Icon.Repeat}
                    onAction={() =>
                      act(() => runpool(["reregister", pool.name]), "Re-registering…", `${pool.name} re-registered`)
                    }
                  />
                )}
              </ActionPanel.Section>

              <ActionPanel.Section title="Capacity">
                {/* A plain range rather than a curated list. Which number is
                    right for a given machine is genuinely unmeasured, so
                    offering 2, 4, 6, 8 implied a view this has no basis for
                    and put 1 and 3 out of reach for no reason. */}
                {[1, 2, 3, 4, 5, 6]
                  .filter((n) => n !== pool.count)
                  .map((n) => (
                    <Action
                      key={n}
                      title={`Set to ${n} Runners`}
                      icon={Icon.Gauge}
                      style={n < pool.count ? Action.Style.Destructive : Action.Style.Regular}
                      onAction={() => setPoolCount(pool, n)}
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

      {/* Three empty states, not one. Checking only isLoading shows "no pools"
          for a frame before the first result lands, which reads as if nothing
          is configured; and a read that fails outright is neither loading nor
          empty. Without the last case the list sits on "Reading Pools" for
          good once the failure toast has faded.

          All three are gated on having no data at all. A refresh that fails
          while previous results are on screen should leave them there. */}
      {!hasFetched && error && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Read Pools"
          description={errorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {!hasFetched && !error && <List.EmptyView icon={Icon.Clock} title="Reading Pools" />}
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
