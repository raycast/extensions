import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArgoInstance } from "./lib/config/instances";
import { InstanceForm } from "./ui/InstanceForm";
import { ApplicationListView } from "./ui/ApplicationListView";
import { loginToInstance } from "./ui/loginToInstance";
import { readPreferences } from "./ui/preferences";
import { loadInstances, loadRecentKeys, loadScope, saveInstances, saveScope } from "./ui/storage";
import { useApplications } from "./ui/useApplications";

const ALL_SCOPE = "all";

export default function SearchApplications() {
  const { push } = useNavigation();
  const [instances, setInstances] = useState<ArgoInstance[]>([]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [scope, setScope] = useState(ALL_SCOPE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const [stored, recents, savedScope] = await Promise.all([loadInstances(), loadRecentKeys(), loadScope()]);
      setInstances(stored);
      setRecentKeys(recents);
      setScope(savedScope);
      setReady(true);
    })();
  }, []);

  const enabled = useMemo(() => instances.filter((instance) => instance.enabled), [instances]);
  const scoped = useMemo(
    () => (scope === ALL_SCOPE ? enabled : enabled.filter((instance) => instance.id === scope)),
    [enabled, scope],
  );

  const { states, loading, refresh } = useApplications(scoped);
  const { maxResults } = readPreferences();

  const login = useCallback(
    async (instance: ArgoInstance) => {
      if (await loginToInstance(instance)) {
        refresh(instance.id);
      }
    },
    [refresh],
  );

  if (ready && instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Plus}
          title="No ArgoCD instance configured"
          description="Add one, then search every instance at once from here."
          actions={
            <ActionPanel>
              <Action
                title="Add Instance"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <InstanceForm
                      instances={instances}
                      onSaved={async (next) => {
                        await saveInstances(next);
                        setInstances(next);
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <ApplicationListView
      states={states}
      loading={!ready || loading}
      limit={maxResults}
      recentKeys={recentKeys}
      onRefresh={refresh}
      onLogin={(instance) => void login(instance)}
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
    />
  );
}
