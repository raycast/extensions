import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildStopArgs } from "../lib/command-builders";
import type { BlockDescriptor } from "../lib/cold-turkey";
import { classifyStopPasswordError, type BlockKind } from "../lib/cli-output";
import { cliErrorText, executeCli } from "../lib/ui";

interface StopPasswordFormProps {
  blockName: string;
  blockKind: BlockKind;
  onSuccess?: () => void | Promise<void>;
}

export function StopPasswordForm({ blockName, blockKind, onSuccess }: StopPasswordFormProps) {
  const { pop } = useNavigation();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const isDevice = blockKind === "device";
  const actionTitle = isDevice ? "Disable Device Block Schedule" : "Stop Block";

  async function handleSubmit() {
    setPasswordError(undefined);

    if (!password || password.includes("\0")) {
      setPasswordError("Use a non-empty password without null characters.");
      return;
    }

    const descriptor: BlockDescriptor = { name: blockName, kind: blockKind };
    const result = await executeCli({
      args: buildStopArgs(blockName, password),
      workingTitle: isDevice ? `Disabling schedule for ${blockName}…` : `Stopping ${blockName}…`,
      successTitle: isDevice ? `Disabled schedule for ${blockName}` : `Stopped ${blockName}`,
      verification: {
        type: "state",
        block: descriptor,
        expectedState: "disabled",
      },
      onSuccess: () => onSuccess?.(),
      onError: (error) => {
        if (classifyStopPasswordError(cliErrorText(error)) !== "invalid-password") return false;
        setPasswordError("Cold Turkey rejected this password.");
        return true;
      },
    });

    if (result) pop();
  }

  return (
    <Form
      navigationTitle="Password Required"
      actions={
        <ActionPanel>
          <Action.SubmitForm title={actionTitle} icon={Icon.Stop} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Block" text={blockName} />
      <Form.Description
        title="Password Required"
        text="Cold Turkey reported that this block is protected by a password lock. Enter its password to continue."
      />
      <Form.PasswordField
        id="password"
        title="Block Password"
        autoFocus
        value={password}
        onChange={(value) => {
          setPassword(value);
          setPasswordError(undefined);
        }}
        error={passwordError}
        info="The password remains only in this form and is not stored by the extension. Successful stopping is confirmed with -status."
      />
    </Form>
  );
}
