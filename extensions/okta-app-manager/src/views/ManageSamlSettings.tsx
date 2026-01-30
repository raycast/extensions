import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getApp, getSamlFields, putApp, setSamlFields } from "../okta";

type Props = {
  appId: string;
};

export default function ManageSamlSettings({ appId }: Props) {
  const [loading, setLoading] = useState(true);

  const [ssoAcsUrl, setSsoAcsUrl] = useState("");
  const [destination, setDestination] = useState("");
  const [recipient, setRecipient] = useState("");
  const [audience, setAudience] = useState("");
  const [defaultRelayState, setDefaultRelayState] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const app = await getApp(appId);
        if (!alive) return;

        if (app.signOnMode !== "SAML_2_0") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Not a SAML app",
            message: `signOnMode ${app.signOnMode || "Unknown"}`,
          });
          return;
        }

        const s = getSamlFields(app);
        setSsoAcsUrl(s.ssoAcsUrl || "");
        setDestination(s.destination || "");
        setRecipient(s.recipient || "");
        setAudience(s.audience || "");
        setDefaultRelayState(s.defaultRelayState || "");
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

  async function save() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving" });

      const app = await getApp(appId);
      if (app.signOnMode !== "SAML_2_0") {
        await showToast({ style: Toast.Style.Failure, title: "Not a SAML app" });
        return;
      }

      const updated = setSamlFields(app, { ssoAcsUrl, destination, recipient, audience, defaultRelayState });
      await putApp(appId, updated);

      await showToast({ style: Toast.Style.Success, title: "Saved" });
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
      <Form.TextField id="ssoAcsUrl" title="SSO ACS URL" value={ssoAcsUrl} onChange={setSsoAcsUrl} />
      <Form.TextField id="destination" title="Destination" value={destination} onChange={setDestination} />
      <Form.TextField id="recipient" title="Recipient" value={recipient} onChange={setRecipient} />
      <Form.TextField id="audience" title="Entity ID Audience" value={audience} onChange={setAudience} />
      <Form.TextField
        id="defaultRelayState"
        title="Default Relay State"
        value={defaultRelayState}
        onChange={setDefaultRelayState}
      />
      <Form.Description
        title="Notes"
        text="Some app types may reject updates to these fields depending on the integration"
      />
    </Form>
  );
}
