import { Action, ActionPanel, Application, getApplications, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { act, getState, State } from "./lib/client";
import { done, ErrorView, fail } from "./lib/ui";

interface Data {
  state: State;
  apps: Application[];
}

const load = async (): Promise<Data> => ({ state: await getState(), apps: await getApplications() });

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export default function Command() {
  const { data, error, isLoading, revalidate, mutate } = usePromise(load);

  const toggle = async (app: { name: string; bundleId: string }, excluded: boolean) => {
    try {
      const next = await act({ cmd: "exclude", bundleID: app.bundleId, excluded });
      await mutate(Promise.resolve(next), {
        optimisticUpdate: () => (data ? { ...data, state: next } : undefined) as Data,
        shouldRevalidateAfter: false,
      });
      await done(excluded ? `TalkRemind now ignores ${app.name}` : `TalkRemind reminds you in ${app.name} again`);
    } catch (e) {
      await fail(e);
    }
  };

  const excludedIds = new Set(data?.state.excludedApps);
  const installed = new Map<string, Application>();
  for (const app of data?.apps ?? [])
    if (app.bundleId && !installed.has(app.bundleId)) installed.set(app.bundleId, app);

  // An excluded app may no longer be installed; it stays in the list so it can still be included again.
  const excluded = [...excludedIds]
    .map((bundleId) => ({ bundleId, name: installed.get(bundleId)?.name ?? bundleId, app: installed.get(bundleId) }))
    .sort(byName);
  const others = [...installed.values()]
    .filter((app) => !excludedIds.has(app.bundleId as string))
    .map((app) => ({ bundleId: app.bundleId as string, name: app.name, app }))
    .sort(byName);

  const item = (entry: (typeof excluded)[number], isExcluded: boolean) => (
    <List.Item
      key={entry.bundleId}
      title={entry.name}
      subtitle={entry.app ? undefined : "Not installed"}
      icon={entry.app ? { fileIcon: entry.app.path } : Icon.AppWindow}
      keywords={[entry.bundleId]}
      accessories={isExcluded ? [{ icon: Icon.EyeDisabled, tooltip: "TalkRemind ignores this app" }] : []}
      actions={
        <ActionPanel>
          <Action
            title={isExcluded ? "Include App" : "Exclude App"}
            icon={isExcluded ? Icon.Eye : Icon.EyeDisabled}
            onAction={() => toggle(entry, !isExcluded)}
          />
          <Action.CopyToClipboard title="Copy Bundle Identifier" content={entry.bundleId} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps">
      {error && !data ? (
        <ErrorView error={error} retry={revalidate} />
      ) : (
        <>
          <List.Section title="Excluded" subtitle={String(excluded.length)}>
            {excluded.map((entry) => item(entry, true))}
          </List.Section>
          <List.Section title="Included" subtitle={String(others.length)}>
            {others.map((entry) => item(entry, false))}
          </List.Section>
        </>
      )}
    </List>
  );
}
