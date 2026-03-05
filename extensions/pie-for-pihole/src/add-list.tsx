import { Action, ActionPanel, Detail, Form, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

export default function AddList() {
  if (!isV6()) {
    return (
      <Detail
        markdown="## This command requires Pi-hole v6\n\nPlease update your Pi-hole version in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { address: string; type: string }) {
    const address = values.address.trim();
    if (!address) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No address provided",
      });
      return;
    }

    setIsSubmitting(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Adding subscription list...",
    });

    try {
      const api = getPiholeAPI();
      await api.addSubscriptionList(address, values.type as "allow" | "block");
      await showToast({
        style: Toast.Style.Success,
        title: "Subscription list added",
        message: address,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add subscription list",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Add Subscription List"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add List" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="address" title="List URL" placeholder="https://raw.githubusercontent.com/..." />
      <Form.Dropdown id="type" title="List Type" defaultValue="block">
        <Form.Dropdown.Item value="block" title="Block" />
        <Form.Dropdown.Item value="allow" title="Allow" />
      </Form.Dropdown>
    </Form>
  );
}
