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
import { PoolDetail } from "./components/PoolDetail";
import { Requirements } from "./components/Requirements";
import { SetRunnerCount } from "./components/SetRunnerCount";
import { useRequirements } from "./hooks/useRequirements";
import { useStatus } from "./hooks/useStatus";
import {
  errorMessage,
  findGh,
  fraction,
  getStatus,
  githubUnchecked,
  isUnreachable,
  ownerAvatar,
  Pool,
  poolState,
  runpool,
  surplusRegistrations,
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
  const { status, isLoading, hasFetched, error, revalidate } = useStatus();
  const { missing, recheck } = useRequirements();

  if (missing) return <Requirements missing={missing} onRecheck={recheck} />;

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

  /**
   * Resize a pool, deciding what to do from a fresh read rather than from the
   * count the row was rendered with.
   *
   * The target is a function of that fresh read, not a number, because the two
   * ways in here want different things when the pool has moved underneath the
   * list. The form asks for an absolute count and means it. The step actions
   * ask for one more or one fewer, and only that intent survives: resolving
   * their target from the row meant "Decrease to 3" grew a pool that had since
   * dropped to 2, silently, because growing needs no confirmation.
   */
  async function applyPoolCount(pool: Pool, target: (current: Pool) => number) {
    try {
      const current = (await getStatus({ local: true })).pools.find((candidate) => candidate.name === pool.name);
      if (!current) throw new Error(`Pool "${pool.name}" no longer exists.`);

      const count = target(current);
      if (count === current.count) return;
      if (count < 1) {
        await showFailureToast(new Error("A pool cannot have fewer than one runner."), {
          title: `${pool.name} is already at one runner`,
        });
        return;
      }

      // runpool refuses to resize a pool mid-job rather than failing the jobs.
      // Say so before asking anything, rather than after a confirmation that
      // was never going to be acted on.
      if (current.busy > 0) {
        await showFailureToast(
          new Error("runpool refuses to resize a busy pool, because it would fail those jobs. Wait, then try again."),
          {
            title: `${pool.name} is running ${current.busy} ${current.busy === 1 ? "job" : "jobs"}`,
          },
        );
        return;
      }

      if (count < current.count) {
        const confirmed = await confirmAlert({
          title: `Reduce ${pool.name} to ${count} runners?`,
          message:
            "The surplus runners are deregistered from GitHub, not just stopped. Growing the pool again registers new ones.",
          primaryAction: { title: "Reduce", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      // Everything above decided from `current`, and `set-count` writes an
      // absolute number rather than a change. A confirmation sits open for as
      // long as it takes to read, and a pool can be resized from another
      // window, the AI tools or a terminal in that time, so writing the number
      // worked out before the question could deregister runners nobody agreed
      // to.
      //
      // `--if-count` below is what actually settles this: runpool refuses the
      // write unless the pool is still where the decision was made, and holds a
      // lock so two resizes cannot interleave. This read stays because it says
      // something better than a command failure when the pool has obviously
      // moved. Anything older than 0.9.0 ignores the flag rather than rejecting
      // it, which is why the requirements check refuses those outright.
      const settled = (await getStatus({ local: true })).pools.find((candidate) => candidate.name === pool.name);
      if (settled?.count !== current.count) {
        await showFailureToast(
          new Error(
            settled
              ? `It now has ${settled.count} ${settled.count === 1 ? "runner" : "runners"}. Nothing was changed, so run this again against the current figure.`
              : "It no longer exists. Nothing was changed.",
          ),
          { title: `${pool.name} was resized somewhere else` },
        );
        return;
      }

      await act(
        () => runpool(["set-count", pool.name, String(count), "--if-count", String(current.count)]),
        `Resizing to ${count}…`,
        `${pool.name} now has ${count} runners`,
      );
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Read Current Pool Capacity" });
    }
  }

  /** One more or one fewer than the pool actually has, not than the row shows. */
  const stepPoolCount = (pool: Pool, delta: number) => applyPoolCount(pool, (current) => current.count + delta);

  /** Exactly the number the form was given. */
  const setPoolCount = (pool: Pool, count: number) => applyPoolCount(pool, () => count);

  const ghMissing = findGh() === null;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter pools">
      {/* `runpool status` treats an unusable `gh` as "GitHub could not be
          asked" and reports those fields as null rather than failing, so
          without this the list would go on showing every pool as healthy
          while the registration check it relies on was not running at all.
          A row rather than a whole screen: everything else here is local and
          still works. */}
      {status && githubUnchecked(status) && (
        <List.Section title="GitHub could not be asked">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={ghMissing ? "GitHub CLI is not installed" : "GitHub did not answer"}
            subtitle="Registrations are not being checked, so an unreachable pool still reads as healthy"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show What to Do"
                  icon={Icon.Info}
                  target={<Requirements missing={ghMissing ? "gh" : "gh-auth"} />}
                />
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

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
            // A note rather than a state, because it is not a fault. Repository
            // pools only: an org scope counts other pools and other machines.
            ...(surplusRegistrations(pool) !== null
              ? [
                  {
                    icon: { source: Icon.Info, tintColor: Color.SecondaryText },
                    tooltip: `GitHub has ${pool.github_registered} runners registered for ${pool.target}, but this pool expects ${pool.count}. Usually runners a shrink removed locally without reaching GitHub to deregister them.`,
                  },
                ]
              : []),
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
                {/* One step either way, titled with where it lands, because a
                    step is the change people actually make. A fixed list of
                    numbers was a ceiling as well as a menu: runpool takes 1 to
                    9999, so a pool registered above whatever the list stopped
                    at could be shrunk here and never restored. The form has no
                    ceiling, which is the only way to close that properly. */}
                <Action
                  title={`Increase to ${pool.count + 1} Runners`}
                  icon={Icon.Plus}
                  onAction={() => stepPoolCount(pool, 1)}
                />
                {pool.count > 1 && (
                  <Action
                    title={`Decrease to ${pool.count - 1} ${pool.count - 1 === 1 ? "Runner" : "Runners"}`}
                    icon={Icon.Minus}
                    style={Action.Style.Destructive}
                    onAction={() => stepPoolCount(pool, -1)}
                  />
                )}
                <Action.Push
                  title="Set Runner Count…"
                  icon={Icon.Gauge}
                  target={<SetRunnerCount pool={pool} onSubmit={(count) => setPoolCount(pool, count)} />}
                />
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
