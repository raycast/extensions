import React from "react";
import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { parseDiscordInput, isDiscordDeepLink, openDeepLink } from "./utils/discord";

/**
 * Quick Open by IDs (no persistence)
 * - Server: guildId
 * - Channel: guildId + channelId
 * - DM: dmChannelId
 * - Message:
 *   - Guild message: guildId + channelId + messageId
 *   - DM message: channelId + messageId (leave guildId empty)
 */
export default function OpenByIds() {
  const [identifier, setIdentifier] = useState("");

  const handleSubmit = async () => {
    const input = identifier.trim();
    const parsed = parseDiscordInput(input);
    if (!parsed || !isDiscordDeepLink(parsed)) {
      await showToast(Toast.Style.Failure, "Invalid Input", "Enter a valid Discord identifier or link.");
      return;
    }
    await openDeepLink(parsed);
    await showToast(Toast.Style.Success, "Opened in Discord");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Open" onSubmit={handleSubmit} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="identifier"
        title="Identifier or Link"
        placeholder="discord link, https link, IDs (e.g. 123/456[/789]), @me/456, dm:456"
        value={identifier}
        onChange={setIdentifier}
      />
      <Form.Description title="Tip" text="Enter any channel/DM/server identifier; we'll resolve it automatically." />
    </Form>
  );
}
