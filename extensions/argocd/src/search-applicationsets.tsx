import { Action, ActionPanel, Color, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { appSetKey, rollupAppSet, type AppSetSummary } from "./lib/argocd/appset";
import { AuthError } from "./lib/auth/provider";
import type { AppSummary } from "./lib/argocd/types";
import type { ArgoInstance } from "./lib/config/instances";
import { rankAppSets } from "./lib/search/score";
import { AppSetApplications } from "./ui/AppSetApplications";
import { makeCache, makeClient } from "./ui/deps";
import { readPreferences } from "./ui/preferences";
import { loadInstances, loadScope, saveScope } from "./ui/storage";
import { environmentColor } from "./ui/statusVisuals";
import { useAppSets } from "./ui/useAppSets";

const ALL_SCOPE = "all";

export default function SearchApplicationSets() {
  const { push } = useNavigation();
  const [instances, setInstances] = useState<ArgoInstance[]>([]);
  const [scope, setScope] = useState(ALL_SCOPE);
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState<AppSummary[]>([]);
  // Which instances the applications cache actually held an entry for. A cold cache is not the
  // same as an ApplicationSet that generated nothing, and rendering "0 apps" for both claimed
  // a count that was never measured.
  const [counted, setCounted] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const [stored, savedScope] = await Promise.all([loadInstances(), loadScope()]);
      setInstances(stored);
      setScope(savedScope);
      setReady(true);

      // The rollup counts come from the applications cache the other command already fills:
      // reading it here is free and avoids a second full applications request.
      const cache = makeCache();
      const cached = await Promise.all(stored.map((instance) => cache.read(instance.id)));
      setApps(cached.flatMap((entry) => entry?.apps ?? []));
      setCounted(new Set(stored.filter((instance, index) => cached[index] !== undefined).map((i) => i.id)));
    })();
  }, []);

  const enabled = useMemo(() => instances.filter((instance) => instance.enabled), [instances]);
  const scoped = useMemo(
    () => (scope === ALL_SCOPE ? enabled : enabled.filter((instance) => instance.id === scope)),
    [enabled, scope],
  );

  const { states, loading, refresh } = useAppSets(scoped);
  const { maxResults } = readPreferences();

  const ranked = useMemo(() => {
    const all = states.flatMap((state) => state.appSets);
    if (query.trim().length === 0) {
      const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
      return {
        items: sorted.slice(0, maxResults),
        truncated: sorted.length > maxResults,
        total: sorted.length,
      };
    }
    return rankAppSets(all, query, maxResults);
  }, [states, query, maxResults]);

  const grouped = useMemo(() => {
    const map = new Map<string, AppSetSummary[]>();
    for (const appSet of ranked.items) {
      const bucket = map.get(appSet.instanceId);
      if (bucket) {
        bucket.push(appSet);
      } else {
        map.set(appSet.instanceId, [appSet]);
      }
    }
    return map;
  }, [ranked]);

  const showInstance = states.length > 1;
  const authFailures = states.filter((state) => state.error instanceof AuthError);

  return (
    <List
      isLoading={!ready || loading}
      filtering={false}
      throttle={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search ApplicationSets by name, namespace or project"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Which instances to search"
          value={scope}
          onChange={(value) => {
            setScope(value);
            void saveScope(value);
          }}
        >
          <List.Dropdown.Item value={ALL_SCOPE} title="All instances" icon={Icon.Globe} />
          {enabled.map((instance) => (
            <List.Dropdown.Item key={instance.id} value={instance.id} title={instance.name} icon={Icon.HardDrive} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={authFailures.length > 0 ? Icon.Key : Icon.Layers}
        title={
          authFailures.length > 0
            ? `${authFailures.map((state) => state.instance.name).join(", ")} needs authentication`
            : emptyTitle(instances.length, apps.length, query)
        }
        description={
          authFailures.length > 0
            ? authFailures.map((state) => state.error?.message ?? "").join("\n")
            : emptyDescription(instances.length, apps.length, query)
        }
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
          </ActionPanel>
        }
      />

      {states.map((state) => {
        const rows = grouped.get(state.instance.id) ?? [];
        if (rows.length === 0 && !state.error) {
          return null;
        }
        return (
          <List.Section
            key={state.instance.id}
            title={showInstance ? state.instance.name : "ApplicationSets"}
            subtitle={sectionSubtitle(state, rows.length)}
          >
            {rows.map((appSet) => {
              const rollup = rollupAppSet(apps, appSet);
              const known = counted.has(appSet.instanceId);
              const url = makeClient(state.instance).appSetUrl(appSet.name, appSet.namespace);
              return (
                <List.Item
                  key={appSetKey(appSet)}
                  icon={{
                    source: Icon.Layers,
                    tintColor: appSet.conditionError ? Color.Red : Color.SecondaryText,
                  }}
                  title={appSet.name}
                  subtitle={appSet.project ?? appSet.namespace}
                  accessories={[
                    ...(appSet.conditionError
                      ? [
                          {
                            tag: { value: "generator error", color: Color.Red },
                            tooltip: appSet.conditionError,
                          },
                        ]
                      : []),
                    ...(known && rollup.degraded > 0
                      ? [{ tag: { value: `${rollup.degraded} degraded`, color: Color.Red } }]
                      : []),
                    ...(known && rollup.outOfSync > 0
                      ? [{ tag: { value: `${rollup.outOfSync} out of sync`, color: Color.Yellow } }]
                      : []),
                    known
                      ? { text: `${rollup.total} apps` }
                      : {
                          icon: Icon.QuestionMark,
                          tooltip: "Open Search Applications once to count the generated applications.",
                        },
                    ...(showInstance
                      ? [{ tag: { value: state.instance.name, color: environmentColor(state.instance.env) } }]
                      : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title="Show Generated Applications"
                          icon={Icon.Box}
                          onAction={() =>
                            push(
                              <AppSetApplications
                                instance={state.instance}
                                namespace={appSet.namespace}
                                appSetName={appSet.name}
                              />,
                            )
                          }
                        />
                        <Action.OpenInBrowser title="Open in ArgoCD" url={url} />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard title="Copy ApplicationSet Name" content={appSet.name} />
                        <Action.CopyToClipboard
                          title="Copy ArgoCD URL"
                          content={url}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={refresh}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}

      {ranked.truncated ? (
        <List.Section
          title="Truncated"
          subtitle={`showing ${ranked.items.length} of ${ranked.total}, refine the search`}
        >
          <List.Item
            icon={Icon.Ellipsis}
            title={`${ranked.total - ranked.items.length} more ApplicationSets match`}
            subtitle="Type more of the name, the namespace or the project."
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function sectionSubtitle(
  state: { error: Error | undefined; fromApi: number; appSets: AppSetSummary[] },
  shown: number,
): string {
  if (state.error) {
    return `${shown} shown, ${state.error instanceof AuthError ? "needs authentication" : state.error.name}`;
  }
  const derived = state.appSets.length - state.fromApi;
  if (state.fromApi === 0 && derived > 0) {
    return `${shown} shown, all reconstructed from their applications`;
  }
  if (derived > 0) {
    return `${shown} shown, ${derived} reconstructed from their applications`;
  }
  return `${shown} shown`;
}

function emptyTitle(instanceCount: number, appCount: number, query: string): string {
  if (instanceCount === 0) {
    return "No ArgoCD instance configured";
  }
  if (appCount === 0) {
    return "No applications cached yet";
  }
  return query.trim().length > 0 ? `No ApplicationSet matches "${query.trim()}"` : "No ApplicationSet found";
}

function emptyDescription(instanceCount: number, appCount: number, query: string): string {
  if (instanceCount === 0) {
    return "Add one from the Manage Instances command.";
  }
  if (appCount === 0) {
    // Both halves of the answer need it: the derived half reads the applications cache, and an
    // empty API answer is indistinguishable from "no ApplicationSets" without it.
    return "Open Search Applications once to fill the cache. ApplicationSets are also reconstructed from the applications they own.";
  }
  if (query.trim().length > 0) {
    return "Try the namespace or the project instead.";
  }
  return "Neither the ApplicationSet API nor the applications in the cache reported one.";
}
