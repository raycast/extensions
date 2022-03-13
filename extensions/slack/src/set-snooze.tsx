import { Action, ActionPanel, Detail, Form, showHUD } from "@raycast/api";
import formatDistance from "date-fns/formatDistance";
import { useEffect, useState } from "react";

import { SlackClient, SnoozeStatus } from "./shared/client";

export default function Command() {
  const [snoozeStatus, setSnoozeStatus] = useState<SnoozeStatus>();

  useEffect(() => {
    SlackClient.getSnoozeStatus().then(setSnoozeStatus);
  }, []);

  if (!snoozeStatus) {
    return <Detail isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async ({ snooze }) => {
              if (snooze.startsWith("activate-for-")) {
                const minutes = parseInt(snooze.replace("activate-for-", ""));
                await SlackClient.setSnooze(minutes);
                await showHUD(`Activated`);
              } else {
                await SlackClient.endSnooze();
                await showHUD(`Deactivated`);
              }

              setSnoozeStatus(undefined);
              SlackClient.getSnoozeStatus().then(setSnoozeStatus);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current status"
        text={
          snoozeStatus.snoozeEnd
            ? `Activated (for ${formatDistance(new Date(), snoozeStatus.snoozeEnd)})`
            : "Deactivated"
        }
      />
      <Form.Separator />
      <Form.Dropdown id="snooze" title="Set Snooze" defaultValue={snoozeStatus.snoozeEnd ? "deactivate" : undefined}>
        {snoozeStatus.snoozeEnd && <Form.Dropdown.Item value="deactivate" title="Deactivate" icon="❌" />}
        <Form.Dropdown.Item value="activate-for-30" title="Activate for 30 minutes" icon="⏲️" />
        <Form.Dropdown.Item value="activate-for-60" title="Activate for 1 hour" icon="⏲️" />
        <Form.Dropdown.Item value="activate-for-120" title="Activate for 2 hours" icon="⏲️" />
      </Form.Dropdown>
    </Form>
  );
}
