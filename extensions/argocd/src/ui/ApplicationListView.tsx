/**
 * The applications list, shared by the Search Applications command and by the filtered view an
 * ApplicationSet pushes.
 *
 * Raycast's own filtering is off and the ranking is ours, for one reason: rendering is the
 * bottleneck, not matching. A few thousand List.Item nodes is what makes the command feel slow,
 * so the list never renders more than `limit` rows and says so when it truncates.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ComponentProps } from "react";
import { openManageInstances } from "./launch";
import { useMemo, useState } from "react";
import { UnreachableError } from "../lib/argocd/errors";
import { AuthError } from "../lib/auth/provider";
import type { AppSummary } from "../lib/argocd/types";
import { instanceHost, type ArgoInstance } from "../lib/config/instances";
import { defaultOrder, rankApps } from "../lib/search/score";
import { ApplicationListItem } from "./ApplicationListItem";
import { humanAge } from "./statusVisuals";
import type { InstanceState } from "./useApplications";

interface Props {
  states: InstanceState[];
  loading: boolean;
  limit: number;
  recentKeys: string[];
  onRefresh: (instanceId?: string) => void;
  onLogin: (instance: ArgoInstance) => void;
  navigationTitle?: string;
  // Taken from the component rather than rebuilt from List.Dropdown: an equivalent-looking
  // ReactElement<DropdownProps> is not assignable to it under newer @types/react.
  searchBarAccessory?: ComponentProps<typeof List>["searchBarAccessory"];
  /** Restricts the rows without hiding the instance sections, used by the ApplicationSet view. */
  filter?: (app: AppSummary) => boolean;
  emptyTitle?: string;
}

function stateSubtitle(state: InstanceState): string {
  const age = state.ageSeconds === undefined ? undefined : humanAge(state.ageSeconds);
  if (state.error instanceof UnreachableError) {
    return age ? `cached ${age}, instance unreachable` : "instance unreachable";
  }
  if (state.error instanceof AuthError) {
    // Not "expired": there may never have been a session. The empty state carries the exact
    // reason; this line only has room to say that credentials are the problem.
    return age ? `cached ${age}, needs authentication` : "needs authentication";
  }
  if (state.error) {
    return age ? `cached ${age}, refresh failed` : "refresh failed";
  }
  return age ?? "loading";
}

export function ApplicationListView({
  states,
  loading,
  limit,
  recentKeys,
  onRefresh,
  onLogin,
  navigationTitle,
  searchBarAccessory,
  filter,
  emptyTitle,
}: Props) {
  const [query, setQuery] = useState("");

  const instanceById = useMemo(() => new Map(states.map((state) => [state.instance.id, state.instance])), [states]);

  const apps = useMemo(() => {
    const all = states.flatMap((state) => state.apps);
    return filter ? all.filter(filter) : all;
  }, [states, filter]);

  const ranked = useMemo(
    () => (query.trim().length === 0 ? defaultOrder(apps, recentKeys, limit) : rankApps(apps, query, { limit })),
    [apps, query, recentKeys, limit],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AppSummary[]>();
    for (const app of ranked.items) {
      const bucket = map.get(app.instanceId);
      if (bucket) {
        bucket.push(app);
      } else {
        map.set(app.instanceId, [app]);
      }
    }
    return map;
  }, [ranked]);

  const showInstance = states.length > 1;
  const failing = states.filter((state) => state.error instanceof AuthError);

  return (
    <List
      isLoading={loading}
      filtering={false}
      throttle={false}
      searchBarPlaceholder="Search applications by name, project, namespace or ApplicationSet"
      onSearchTextChange={setQuery}
      navigationTitle={navigationTitle}
      searchBarAccessory={searchBarAccessory}
    >
      <List.EmptyView
        icon={failing.length > 0 ? Icon.Key : Icon.MagnifyingGlass}
        title={
          failing.length > 0
            ? authTitle(failing)
            : (emptyTitle ?? (apps.length === 0 ? "No applications cached yet" : `Nothing matches "${query.trim()}"`))
        }
        // The error's own message says whether there is no session at all, an expired one, or
        // no stored token. Replacing it with a guess is how "no credential" reads as "expired".
        description={failing.length > 0 ? authDescription(failing) : "Refresh to query the instances again."}
        actions={
          <ActionPanel>
            {failing.map((state) =>
              // The offered action has to match the instance's mode: a browser sign-in for
              // single sign-on, a CLI login for the CLI session, and storing a token for the
              // token mode, where neither login helps.
              state.instance.authMode === "token" ? (
                <Action
                  key={state.instance.id}
                  title={`Set the API Token for ${state.instance.name}`}
                  icon={Icon.Key}
                  onAction={() => void openManageInstances()}
                />
              ) : (
                <Action
                  key={state.instance.id}
                  title={
                    state.instance.authMode === "sso"
                      ? `Sign in to ${instanceHost(state.instance)}`
                      : `Log in to ${instanceHost(state.instance)}`
                  }
                  icon={state.instance.authMode === "sso" ? Icon.Fingerprint : Icon.Person}
                  onAction={() => onLogin(state.instance)}
                />
              ),
            )}
            <Action title="Refresh All Instances" icon={Icon.ArrowClockwise} onAction={() => onRefresh()} />
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
            title={showInstance ? state.instance.name : "Applications"}
            subtitle={`${rows.length} shown, ${stateSubtitle(state)}`}
          >
            {rows.map((app) => {
              const instance = instanceById.get(app.instanceId);
              if (!instance) {
                return null;
              }
              return (
                <ApplicationListItem
                  key={`${app.instanceId}/${app.namespace}/${app.name}`}
                  app={app}
                  instance={instance}
                  showInstance={showInstance}
                  onRefresh={onRefresh}
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
            title={`${ranked.total - ranked.items.length} more applications match`}
            subtitle="Type more of the name, the project or the namespace to narrow it down."
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function authTitle(failing: InstanceState[]): string {
  const names = failing.map((state) => state.instance.name).join(", ");
  return failing.length === 1 ? `${names} needs authentication` : `${names} need authentication`;
}

/**
 * Reports what the auth layer actually said, per instance. The distinction matters: "no argocd
 * CLI session for this host" and "the session has expired" have different fixes, and neither is
 * fixed by the action the other one needs.
 */
function authDescription(failing: InstanceState[]): string {
  return failing.map((state) => state.error?.message ?? `${state.instance.name} refused the request.`).join("\n");
}
