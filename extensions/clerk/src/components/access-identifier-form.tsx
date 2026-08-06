import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";

export type ListType = "allowlist" | "blocklist";

export function AccessIdentifierForm({
  app,
  listType,
  onAdded,
}: {
  app: ClerkApp;
  listType: ListType;
  onAdded: () => void;
}) {
  const { pop } = useNavigation();
  const [identifier, setIdentifier] = useState("");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!identifier.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Identifier is required" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding identifier" });
    try {
      if (listType === "allowlist") {
        await clientFor(app).allowlistIdentifiers.createAllowlistIdentifier({ identifier: identifier.trim(), notify });
      } else {
        await clientFor(app).blocklistIdentifiers.createBlocklistIdentifier({ identifier: identifier.trim() });
      }
      toast.style = Toast.Style.Success;
      toast.title = "Identifier added";
      onAdded();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Identifier" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="identifier"
        title="Identifier"
        placeholder="email, phone, or domain"
        value={identifier}
        onChange={setIdentifier}
      />
      {listType === "allowlist" && <Form.Checkbox id="notify" label="Notify" value={notify} onChange={setNotify} />}
    </Form>
  );
}
