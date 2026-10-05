import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getApp, getOidcRedirectUris, putApp, setOidcRedirectUris } from "../okta";

type Props = {
  appId: string;
};

export default function ManageOidcRedirects({ appId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rawUris, setRawUris] = useState<string>("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const app = await getApp(appId);
        if (!alive) return;

        if (app.signOnMode !== "OPENID_CONNECT") {
          setRawUris("");
          await showToast({
            style: Toast.Style.Failure,
            title: "Not an OIDC app",
            message: `signOnMode ${app.signOnMode || "Unknown"}`,
          });
          return;
        }

        const uris = getOidcRedirectUris(app);
        setRawUris(uris.join("\n"));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (!alive) return;
        await showToast({ style: Toast.Style.Failure, title: "Load failed", message: e?.message || "Unknown error" });
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [appId]);

  const normalized = useMemo(() => {
    return rawUris
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [rawUris]);

  async function save() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving" });

      const app = await getApp(appId);
      if (app.signOnMode !== "OPENID_CONNECT") {
        await showToast({ style: Toast.Style.Failure, title: "Not an OIDC app" });
        return;
      }

      const unique = Array.from(new Set(normalized));
      const updated = setOidcRedirectUris(app, unique);
      await putApp(appId, updated);

      await showToast({ style: Toast.Style.Success, title: "Saved", message: `${unique.length} redirect URIs` });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      await showToast({ style: Toast.Style.Failure, title: "Save failed", message: e?.message || "Unknown error" });
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.Check} onAction={save} />
        </ActionPanel>
      }
    >
      <Form.Description title="App ID" text={appId} />
      <Form.TextArea
        id="redirectUris"
        title="Redirect URIs"
        placeholder="One URI per line"
        value={rawUris}
        onChange={setRawUris}
      />
      <Form.Description title="Notes" text="This overwrites the redirect URI list with what you enter here" />
    </Form>
  );
}
