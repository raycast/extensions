import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { OktaApp, adminAppUrl, getApp, getOidcRedirectUris, getSamlFields, searchApps } from "./okta";
import ManageOidcRedirects from "./views/ManageOidcRedirects";
import ManageSamlSettings from "./views/ManageSamlSettings";

import { getCurrentEnv } from "./api/config";

export default function Command() {
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState<OktaApp[]>([]);
  const [loading, setLoading] = useState(false);

  const env = getCurrentEnv();
  const envName = env ? env.name : "No Environment Selected";

  useEffect(() => {
    let alive = true;

    async function run() {
      const q = query.trim();
      if (!q) {
        setApps([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchApps(q);
        if (!alive) return;
        setApps(results);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!alive) return;
        await showToast({ style: Toast.Style.Failure, title: "Search failed", message: e?.message || "Unknown error" });
        setApps([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [query]);

  const sorted = useMemo(() => {
    return [...apps].sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  }, [apps]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search app label (${envName})`}
      onSearchTextChange={setQuery}
      throttle
    >
      {sorted.map((app) => {
        const title = app.label || app.id;
        const subtitleParts = [app.signOnMode, app.status].filter(Boolean).join(" ");
        const adminUrl = adminAppUrl(app);

        return (
          <List.Item
            key={app.id}
            title={title}
            subtitle={subtitleParts}
            icon={app.status === "ACTIVE" ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy ID" content={app.id} />
                <Action.CopyToClipboard title="Copy Label" content={app.label || ""} />

                {app.signOnMode === "OPENID_CONNECT" && (
                  <Action.Push
                    title="Manage OIDC Redirects"
                    icon={Icon.Globe}
                    target={<ManageOidcRedirects appId={app.id} />}
                  />
                )}

                {app.signOnMode === "SAML_2_0" && (
                  <Action.Push
                    title="Manage SAML Settings"
                    icon={Icon.Globe}
                    target={<ManageSamlSettings appId={app.id} />}
                  />
                )}

                {adminUrl ? <Action.OpenInBrowser title="Open in Admin Console" url={adminUrl} /> : null}

                <Action
                  title="Open Manager"
                  icon={Icon.Gear}
                  onAction={async () => {
                    try {
                      await showToast({ style: Toast.Style.Animated, title: "Loading app" });
                      const full = await getApp(app.id);
                      if (full.signOnMode === "OPENID_CONNECT") {
                        const uris = getOidcRedirectUris(full);
                        await Clipboard.copy(JSON.stringify(uris, null, 2));
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Loaded OIDC app",
                          message: "Redirect URIs copied as JSON",
                        });
                      } else if (full.signOnMode === "SAML_2_0") {
                        const s = getSamlFields(full);
                        await Clipboard.copy(JSON.stringify(s, null, 2));
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Loaded SAML app",
                          message: "SAML fields copied as JSON",
                        });
                      } else {
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Loaded app",
                          message: `signOnMode ${full.signOnMode || "Unknown"}`,
                        });
                      }
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Load failed",
                        message: e?.message || "Unknown error",
                      });
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
