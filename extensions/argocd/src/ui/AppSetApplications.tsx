/**
 * The applications one ApplicationSet generated.
 *
 * This is a pure client-side filter over the same cache the main command uses, so it opens
 * instantly and never costs a second round trip. The link is the ownerReference the
 * ApplicationSet controller stamps on each generated application.
 */

import { useCallback, useEffect, useState } from "react";
import { ownedByAppSet } from "../lib/argocd/appset";
import type { ArgoInstance } from "../lib/config/instances";
import { ApplicationListView } from "./ApplicationListView";
import { loginToInstance } from "./loginToInstance";
import { readPreferences } from "./preferences";
import { loadRecentKeys } from "./storage";
import { useApplications } from "./useApplications";

interface Props {
  instance: ArgoInstance;
  namespace: string;
  appSetName: string;
}

export function AppSetApplications({ instance, namespace, appSetName }: Props) {
  const [instances] = useState<ArgoInstance[]>([instance]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const { states, loading, refresh } = useApplications(instances);
  const { maxResults } = readPreferences();

  useEffect(() => {
    void loadRecentKeys().then(setRecentKeys);
  }, []);

  const login = useCallback(async () => {
    // Every mode's login, not just the CLI one: this view used to run `argocd login --sso`
    // for an `sso` instance, which writes a config the provider never reads.
    if (await loginToInstance(instance)) {
      refresh(instance.id);
    }
  }, [instance, refresh]);

  return (
    <ApplicationListView
      states={states}
      loading={loading}
      limit={maxResults}
      recentKeys={recentKeys}
      onRefresh={refresh}
      onLogin={() => void login()}
      navigationTitle={`Applications from ${appSetName}`}
      filter={(app) => ownedByAppSet(app, instance.id, namespace, appSetName)}
      emptyTitle={`${appSetName} has generated no application yet`}
    />
  );
}
