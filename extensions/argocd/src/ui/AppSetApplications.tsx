/**
 * The applications one ApplicationSet generated.
 *
 * This is a pure client-side filter over the same cache the main command uses, so it opens
 * instantly and never costs a second round trip. The link is the ownerReference the
 * ApplicationSet controller stamps on each generated application.
 */

import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ownedByAppSet } from "../lib/argocd/appset";
import { instanceHost, type ArgoInstance } from "../lib/config/instances";
import { ApplicationListView } from "./ApplicationListView";
import { ssoLogin } from "./deps";
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
    const host = instanceHost(instance);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Logging in to ${host}` });
    try {
      await ssoLogin(host);
      toast.style = Toast.Style.Success;
      toast.title = `Logged in to ${host}`;
      refresh(instance.id);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "SSO login did not complete";
      toast.message = (error as Error).message;
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
