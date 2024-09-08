import React from "react";
import { Form, ActionPanel, Action, showToast, Toast, closeMainWindow } from "@raycast/api";
import { controlYouTubeMusic, getRepeatModeName } from "./utils";
import { COMMANDS, RepeatMode } from "./consts";

export default function RepeatCommand(): JSX.Element {
  async function handleSubmit(values: { mode: RepeatMode }) {
    try {
      await controlYouTubeMusic(COMMANDS.REPEAT_MODE, values.mode);
      await showToast({
        style: Toast.Style.Success,
        title: "Repeat Mode Set",
        message: `Mode: ${getRepeatModeName(values.mode)}`,
      });
      await closeMainWindow();
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      await closeMainWindow();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Repeat Mode" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Repeat Mode">
        <Form.Dropdown.Item value={RepeatMode.NONE} title="No Repeat" />
        <Form.Dropdown.Item value={RepeatMode.ALL} title="Repeat All" />
        <Form.Dropdown.Item value={RepeatMode.ONE} title="Repeat One" />
      </Form.Dropdown>
    </Form>
  );
}
