import { Action, ActionPanel, Color, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CliGuard } from "./components/CliGuard";
import { HeldBackView } from "./components/HeldBackView";
import { SkillMarkdownView } from "./components/SkillMarkdownView";
import { checkSkills, updateSkill } from "./lib/api";
import { CliActionResult, useCliAction } from "./hooks/useCliAction";
import { pluralize, updateStatusPresentation } from "./lib/presentation";
import { CheckResult, UpdateResult, heldBack } from "./lib/types";

export default function Command() {
  return <CliGuard>{() => <CheckUpdates />}</CliGuard>;
}

interface Buckets {
  available: CheckResult[];
  failed: CheckResult[];
  upToDate: CheckResult[];
  skipped: CheckResult[];
  other: CheckResult[];
}

function partition(results: CheckResult[]): Buckets {
  const buckets: Buckets = { available: [], failed: [], upToDate: [], skipped: [], other: [] };
  for (const entry of results) {
    if (entry.update_status === "error" || entry.last_check_error) buckets.failed.push(entry);
    else if (entry.update_status === "update_available") buckets.available.push(entry);
    else if (entry.skipped) buckets.skipped.push(entry);
    else if (entry.update_status === "up_to_date") buckets.upToDate.push(entry);
    else buckets.other.push(entry);
  }
  return buckets;
}

function CheckUpdates() {
  const runAction = useCliAction();
  const { push } = useNavigation();

  // `check` only probes remote revisions — it writes nothing — so running it on
  // open is safe, but it does hit the network for every git-backed skill.
  const results = useCachedPromise(() => checkSkills(), [], {
    failureToastOptions: { title: "Could not check for updates" },
  });

  // Partitioned in one pass so every result lands in exactly one section: the
  // flags overlap (a skipped skill can also carry a check error), and an
  // update_status we do not recognise must still be shown rather than dropped.
  const { available, failed, upToDate, skipped, other } = partition(results.data ?? []);

  /**
   * A result carrying `held_back_removals` is not a failure and must not be
   * retried: the CLI refused to delete files the new version does not ship, so
   * the skill sits untouched on its old version. Only the desktop app can
   * override that, so the outcome gets a screen of its own.
   */
  function reportHeldBack(outcome: CliActionResult<UpdateResult[]>) {
    if (outcome.ok && heldBack(outcome.value)) push(<HeldBackView results={outcome.value} />);
  }

  async function update(entry: CheckResult) {
    const outcome = await runAction({
      pending: `Updating ${entry.name}…`,
      run: () => updateSkill(entry.skill_id),
      success: (data) => {
        if (heldBack(data)) return { title: `${entry.name} was left on its old version` };
        const failure = data?.find((result) => result.error);
        if (failure) return { title: `${entry.name} was not updated`, message: failure.error };
        return data?.some((result) => result.refreshed)
          ? { title: `Updated ${entry.name}` }
          : { title: `${entry.name} was left unchanged` };
      },
      failureTitle: `Could not update ${entry.name}`,
      onSuccess: results.revalidate,
    });
    reportHeldBack(outcome);
  }

  /**
   * Updates exactly the skills listed under "Updates Available".
   *
   * Deliberately not `skills update --all`: that selects every skill in the
   * library regardless of status, so it also re-imports every local skill and
   * would make this action do far more than its label says. The CLI takes one
   * reference per invocation, and they share a repository lock, so this runs
   * them in sequence.
   */
  async function updateAll() {
    const targets = [...available];
    const outcome = await runAction({
      pending: `Updating ${pluralize(targets.length, "skill")}…`,
      run: async () => {
        const collected: UpdateResult[] = [];
        for (const entry of targets) {
          collected.push(...(await updateSkill(entry.skill_id)));
        }
        return collected;
      },
      success: (data) => {
        const refreshed = data.filter((result) => result.refreshed);
        const withheld = data.filter((result) => result.held_back_removals !== undefined).length;
        // A per-skill `error` rides along in a batch that still exits zero.
        const failed = data.filter((result) => result.error);
        const notes = [
          withheld > 0 ? `${pluralize(withheld, "skill")} held back` : undefined,
          failed.length > 0 ? `${pluralize(failed.length, "skill")} failed` : undefined,
        ].filter(Boolean);
        const message = notes.length > 0 ? `${notes.join(", ")}.` : refreshed.map((r) => r.name).join(", ");
        return refreshed.length > 0
          ? { title: `Updated ${pluralize(refreshed.length, "skill")}`, message }
          : { title: "Nothing was updated", message: notes.length > 0 ? `${notes.join(", ")}.` : undefined };
      },
      failureTitle: "Could not update skills",
      onSuccess: results.revalidate,
    });
    reportHeldBack(outcome);
  }

  function itemFor(entry: CheckResult, extraActions?: React.ReactNode) {
    const presentation = updateStatusPresentation(entry.update_status);
    return (
      <List.Item
        key={entry.skill_id}
        icon={{ source: presentation.icon, tintColor: presentation.color }}
        title={entry.name}
        subtitle={entry.last_check_error ?? undefined}
        accessories={[{ text: presentation.label }]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {/* Reading leads, as in every other skill list, so a bare Return
                  never starts an update. */}
              <Action.Push
                title="View Skill.md"
                icon={Icon.Document}
                target={<SkillMarkdownView reference={entry.skill_id} title={entry.name} />}
              />
              {extraActions}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Check Again"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={results.revalidate}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={results.isLoading} searchBarPlaceholder="Search skills">
      <List.EmptyView
        icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        title={results.isLoading ? "Checking upstream sources…" : "Nothing to check"}
        description={results.isLoading ? undefined : "Skills with a git source will appear here once you have some."}
      />

      <List.Section title="Updates Available" subtitle={available.length ? String(available.length) : undefined}>
        {available.map((entry) =>
          itemFor(
            entry,
            <>
              <Action
                title="Update"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                onAction={() => update(entry)}
              />
              {available.length > 1 && (
                <Action
                  title={`Update All (${available.length})`}
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  onAction={updateAll}
                />
              )}
            </>,
          ),
        )}
      </List.Section>

      <List.Section title="Check Failed" subtitle={failed.length ? String(failed.length) : undefined}>
        {failed.map((entry) =>
          itemFor(
            entry,
            <Action
              title="Try Update Anyway"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={() => update(entry)}
            />,
          ),
        )}
      </List.Section>

      <List.Section title="Up to Date" subtitle={upToDate.length ? String(upToDate.length) : undefined}>
        {upToDate.map((entry) => itemFor(entry))}
      </List.Section>

      {/* Local skills have no upstream to probe. They are listed so their absence
          from the sections above does not read as an error. */}
      <List.Section title="No Upstream" subtitle={skipped.length ? `${skipped.length} local` : undefined}>
        {skipped.map((entry) => itemFor(entry))}
      </List.Section>

      {/* A status this build does not know about. Listed rather than dropped, so
          a newer CLI never makes skills silently disappear from this view. */}
      <List.Section title="Other" subtitle={other.length ? String(other.length) : undefined}>
        {other.map((entry) => itemFor(entry))}
      </List.Section>
    </List>
  );
}
