import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { instanceHost, type ArgoInstance } from "./lib/config/instances";
import { InstanceForm } from "./ui/InstanceForm";
import { ApplicationListView } from "./ui/ApplicationListView";
import { ssoLogin, writeSsoSession } from "./ui/deps";
import { loginWithSso } from "./ui/oidcLogin";
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
      const [stored, recents, savedScope] = await Promise.all([
        loadInstances(),
        loadRecentKeys(),
        loadScope(),
      ]);
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
      const host = instanceHost(instance);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Signing in to ${host}`,
        message: "Finish the sign-in in your browser.",
      });
      try {
        // The two modes need different logins, and offering the wrong one is how an earlier
        // version told a token instance to run an SSO flow that could not help it.
        if (instance.authMode === "sso") {
          const { session } = await loginWithSso(instance);
          await writeSsoSession(instance.id, session);
        } else {
          await ssoLogin(host);
        }
        toast.style = Toast.Style.Success;
        toast.title = `Signed in to ${host}`;
        toast.message = undefined;
        refresh(instance.id);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Sign-in did not complete";
        toast.message = (error as Error).message;
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
            <List.Dropdown.Item
              key={instance.id}
              value={instance.id}
              title={instance.name}
              icon={Icon.HardDrive}
            />
          ))}
        </List.Dropdown>
      }
    />
  );
}
