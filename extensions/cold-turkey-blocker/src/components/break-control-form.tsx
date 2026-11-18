import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildBreakArgs, type BreakAction } from "../lib/command-builders";
import { executeCli } from "../lib/ui";

interface BreakControlFormProps {
  blockName: string;
  initialAction?: BreakAction;
  onSuccess?: () => void | Promise<void>;
}

export function BreakControlForm({ blockName, initialAction = "start-delay", onSuccess }: BreakControlFormProps) {
  const { pop } = useNavigation();
  const [action, setAction] = useState<BreakAction>(initialAction);

  async function handleSubmit() {
    const result = await executeCli({
      args: buildBreakArgs(blockName, action),
      workingTitle: `${breakActionTitle(action)}…`,
      successTitle: `Sent ${breakActionTitle(action)} for ${blockName}`,
      successMessage: "Cold Turkey exited cleanly, but its CLI cannot verify break state.",
      onSuccess,
    });

    if (result) pop();
  }

  return (
    <Form
      navigationTitle="Control Break"
      actions={
        <ActionPanel>
          <Action.SubmitForm title={breakActionTitle(action)} icon={Icon.Stopwatch} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Block" text={blockName} />

      <Form.Dropdown
        id="action"
        title="Break Action"
        value={action}
        onChange={(value) => setAction(value as BreakAction)}
      >
        <Form.Dropdown.Item value="start-delay" title="Start Delay Break Countdown" icon={Icon.Play} />
        <Form.Dropdown.Item value="stop-delay" title="Stop Delay Break" icon={Icon.Stop} />
        <Form.Dropdown.Item value="stop-random-text" title="Stop Random-Text Break" icon={Icon.Text} />
      </Form.Dropdown>

      <Form.Description
        title="Breaks vs. Locks"
        text="These commands control configured break workflows. Stop Random-Text Break does not remove a block's random-text lock, and -status cannot report whether a break is active."
      />
    </Form>
  );
}

function breakActionTitle(action: BreakAction): string {
  switch (action) {
    case "start-delay":
      return "Start Delay Break";
    case "stop-delay":
      return "Stop Delay Break";
    case "stop-random-text":
      return "Stop Random Text Break";
  }
}
