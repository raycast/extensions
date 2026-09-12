import { Action, ActionPanel, Color, Form, Icon, Toast, closeMainWindow, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { formatDistance } from "date-fns";

import { SlackClient } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { handleError } from "./shared/utils";

function SetSnooze() {
  const { data: snoozeStatus, isLoading, mutate } = useCachedPromise(SlackClient.getSnoozeStatus);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async ({ snooze }) => {
              try {
                if (snooze.startsWith("activate-for-")) {
                  const minutes = parseInt(snooze.replace("activate-for-", ""));
                  await SlackClient.setSnooze(minutes);
                  await closeMainWindow();
                  await showToast({ style: Toast.Style.Success, title: "Activated" });
                } else {
                  await SlackClient.endSnooze();
                  await closeMainWindow();
                  await showToast({ style: Toast.Style.Success, title: "Deactivated" });
                }

                await mutate();
              } catch (error) {
                handleError(error, "Could not set snooze status");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current status"
        text={
          snoozeStatus?.snoozeEnd
            ? `Activated (for ${formatDistance(new Date(), snoozeStatus.snoozeEnd)})`
            : "Deactivated"
        }
      />
      <Form.Separator />
      <Form.Dropdown id="snooze" title="Set Snooze" defaultValue={snoozeStatus?.snoozeEnd ? "deactivate" : undefined}>
        {snoozeStatus?.snoozeEnd && (
          <Form.Dropdown.Item
            value="deactivate"
            title="Deactivate"
            icon={{ source: Icon.Xmark, tintColor: Color.Red }}
          />
        )}
        <Form.Dropdown.Item value="activate-for-30" title="Activate for 30 minutes" icon={Icon.Clock} />
        <Form.Dropdown.Item value="activate-for-60" title="Activate for 1 hour" icon={Icon.Clock} />
        <Form.Dropdown.Item value="activate-for-120" title="Activate for 2 hours" icon={Icon.Clock} />
      </Form.Dropdown>
    </Form>
  );
}

export default withSlackClient(SetSnooze);
