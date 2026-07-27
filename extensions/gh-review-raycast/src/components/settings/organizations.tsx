import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { useConfig, useViewer } from "../../hooks";

/**
 * Picks the organizations the built-in categories are scoped to. Selecting
 * none searches everywhere, which is what a fresh install does.
 */
export function Organizations() {
  const { config, update } = useConfig();
  const { data: viewer, isLoading } = useViewer();

  const orgs = viewer?.orgs ?? [];
  const active = new Set(config.activeOrgs.map((o) => o.toLowerCase()));

  async function toggle(org: string) {
    const next = active.has(org.toLowerCase())
      ? config.activeOrgs.filter((o) => o.toLowerCase() !== org.toLowerCase())
      : [...config.activeOrgs, org];
    await update({ ...config, activeOrgs: next });
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
        title={isLoading ? "Loading organizations…" : "No organizations found"}
        description={
          isLoading
            ? undefined
            : "Your token can't see any orgs. Grant the read:org scope with `gh auth refresh -s read:org`."
        }
      />
      <List.Section
        title="Scope"
        subtitle={config.activeOrgs.length === 0 ? "Searching everywhere" : `${config.activeOrgs.length} selected`}
      >
        {orgs.map((org) => {
          const isActive = active.has(org.toLowerCase());
          return (
            <List.Item
              key={org}
              icon={
                isActive
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={org}
              accessories={isActive ? [{ tag: { value: "in scope", color: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  <Action
                    icon={isActive ? Icon.MinusCircle : Icon.PlusCircle}
                    title={isActive ? "Remove from Scope" : "Add to Scope"}
                    onAction={() => toggle(org)}
                  />
                  <Action
                    icon={Icon.BullsEye}
                    title="Only This Organization"
                    onAction={() => update({ ...config, activeOrgs: [org] })}
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
        })}
      </List.Section>
    </List>
  );
}
