import { Action, ActionPanel, Detail, Form, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";

import { PresenceStatus, SlackClient } from "./shared/client";

export default function Command() {
  const [presence, setPresence] = useState<PresenceStatus>();

  useEffect(() => {
    SlackClient.getPresence().then(setPresence);
  }, []);

  if (!presence) {
    return <Detail isLoading={true} />;
  }

  let currentStatus: string;
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
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async ({ presence }) => {
              if (presence === "offline") {
                await SlackClient.setPresence("away");
                await showHUD(`Force offline`);
              } else {
                await SlackClient.setPresence("auto");
                await showHUD(`Auto`);
              }

              setPresence(undefined);
              SlackClient.getPresence().then(setPresence);
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
        <Form.Dropdown.Item value="offline" title="Force offline" icon="❗" />
        <Form.Dropdown.Item value="auto" title="Auto" icon="⚪" />
      </Form.Dropdown>
    </Form>
  );
}
