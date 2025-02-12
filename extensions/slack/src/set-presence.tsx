import { Action, ActionPanel, Color, Form, Icon, Toast, closeMainWindow, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { SlackClient } from "./shared/client";
import { withSlackClient } from "./shared/withSlackClient";
import { handleError } from "./shared/utils";

function SetPresence() {
  const { data: presence, isLoading, mutate } = useCachedPromise(SlackClient.getPresence);

  let currentStatus = "";
  switch (presence) {
    case "online":
      currentStatus = "Online (Auto)";
      break;
    case "offline":
      currentStatus = "Offline (Auto)";
      break;
    case "forced-offline":
      currentStatus = "Offline (Manually)";
      break;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async ({ presence }) => {
              try {
                if (presence === "offline") {
                  await SlackClient.setPresence("away");
                  await closeMainWindow();
                  await showToast({ style: Toast.Style.Success, title: "Force offline" });
                } else {
                  await SlackClient.setPresence("auto");
                  await closeMainWindow();
                  await showToast({ style: Toast.Style.Success, title: "Auto" });
                }

                await mutate();
              } catch (error) {
                handleError(error, "Could not set presence");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Current status" text={`${presence === "online" ? "🟢" : "🔴"} ${currentStatus}`} />
      <Form.Separator />
      <Form.Dropdown
        id="presence"
        title="Set Presence"
        defaultValue={presence === "forced-offline" ? "auto" : "offline"}
      >
        <Form.Dropdown.Item
          value="offline"
          title="Force offline"
          icon={{ source: Icon.Exclamationmark, tintColor: Color.Red }}
        />
        <Form.Dropdown.Item value="auto" title="Auto" icon={Icon.CircleFilled} />
      </Form.Dropdown>
    </Form>
  );
}

export default withSlackClient(SetPresence);
