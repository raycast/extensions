import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect } from "react";

import { useConfig, useViewer } from "../../hooks";
import { ensureOwnerInScope } from "../../lib/config";

/**
 * Picks the owners the built-in categories are scoped to. Selecting none
 * searches everywhere, which is what a fresh install does.
 *
 * Your own account is listed alongside the organizations: scoping to a
 * personal owner is supported everywhere else, so it needs to be reachable
 * from here too.
 */
export function Organizations() {
  const { config, update, revalidate } = useConfig();
  const { data: viewer, isLoading } = useViewer();

  const orgs = viewer?.orgs ?? [];
  const login = viewer?.login ?? "";
  const active = new Set(config.activeOrgs.map(o => o.toLowerCase()));

  // Show your account already ticked the first time this screen knows who you
  // are, rather than waiting for the menu bar's next run to seed it.
  useEffect(() => {
    if (!login || config.ownerSeeded) return;
    ensureOwnerInScope(config, login).then(next => {
      if (next !== config) revalidate();
    });
  }, [login, config, revalidate]);

  async function toggle(org: string) {
    if (active.has(org.toLowerCase())) {
      await update({ ...config, activeOrgs: config.activeOrgs.filter(o => o.toLowerCase() !== org.toLowerCase()) });
      return;
    }

    // Narrowing an empty scope for the first time would otherwise drop your own
    // repositories, which were in scope a moment ago.
    const seedSelf = config.activeOrgs.length === 0 && login && org.toLowerCase() !== login.toLowerCase();
    await update({ ...config, activeOrgs: seedSelf ? [login, org] : [...config.activeOrgs, org] });
  }

  function ownerItem(owner: string, icon: Icon) {
    const isActive = active.has(owner.toLowerCase());
    return (
      <List.Item
        key={owner}
        icon={
          isActive
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : { source: Icon.Circle, tintColor: Color.SecondaryText }
        }
        title={owner}
        accessories={isActive ? [{ tag: { value: "in scope", color: Color.Green } }] : [{ icon }]}
        actions={
          <ActionPanel>
            <Action
              icon={isActive ? Icon.MinusCircle : Icon.PlusCircle}
              title={isActive ? "Remove from Scope" : "Add to Scope"}
              onAction={() => toggle(owner)}
            />
            <Action
              icon={Icon.BullsEye}
              title="Only This Owner"
              onAction={() => update({ ...config, activeOrgs: [owner] })}
            />
            <Action
              icon={Icon.Globe}
              title="Search Everywhere"
              onAction={() => update({ ...config, activeOrgs: [] })}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Organizations"
      searchBarPlaceholder="Filter organizations…"
      actions={
        <ActionPanel>
          <Action icon={Icon.Globe} title="Search Everywhere" onAction={() => update({ ...config, activeOrgs: [] })} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Building}
        title={isLoading ? "Loading owners…" : "No owners found"}
        description={
          isLoading
            ? undefined
            : "Your token can't see any orgs. Grant the read:org scope with `gh auth refresh -s read:org`."
        }
      />
      {login ? (
        <List.Section title="Your Account" subtitle="Your own repositories">
          {ownerItem(login, Icon.Person)}
        </List.Section>
      ) : null}
      <List.Section
        title="Organizations"
        subtitle={config.activeOrgs.length === 0 ? "Searching everywhere" : `${config.activeOrgs.length} selected`}
      >
        {orgs.map(org => ownerItem(org, Icon.Building))}
      </List.Section>
    </List>
  );
}
