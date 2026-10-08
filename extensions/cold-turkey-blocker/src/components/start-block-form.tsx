import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildStartArgs, type StartMode } from "../lib/command-builders";
import type { BlockDescriptor } from "../lib/cold-turkey";
import { blockKindLabel, type BlockKind } from "../lib/cli-output";
import { confirmPotentialLock, executeCli } from "../lib/ui";

type StartOptionMode = StartMode;

interface StartBlockFormProps {
  blockName: string;
  blockKind: BlockKind;
  initialMode?: StartOptionMode;
  onSuccess?: () => void | Promise<void>;
}

export function StartBlockForm({ blockName, blockKind, initialMode = "as-is", onSuccess }: StartBlockFormProps) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<StartOptionMode>(initialMode);
  const [minutes, setMinutes] = useState("60");
  const [password, setPassword] = useState("");
  const [randomTextLength, setRandomTextLength] = useState("100");
  const [minutesError, setMinutesError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [randomTextError, setRandomTextError] = useState<string>();

  async function handleSubmit() {
    clearErrors();

    const parsedMinutes = parseWholeNumber(minutes);
    const parsedRandomTextLength = parseWholeNumber(randomTextLength);

    if (mode === "timed" && (parsedMinutes === undefined || parsedMinutes < 1)) {
      setMinutesError("Enter a whole number of at least 1 minute.");
      return;
    }

    if (mode === "password" && !isValidCliPassword(password)) {
      setPasswordError("Use a non-empty password without null characters.");
      return;
    }

    if (
      mode === "random-text" &&
      (parsedRandomTextLength === undefined || parsedRandomTextLength < 1 || parsedRandomTextLength > 999)
    ) {
      setRandomTextError("Enter a whole number between 1 and 999.");
      return;
    }

    const confirmed =
      (mode === "unlocked" && blockKind !== "device") ||
      (await confirmPotentialLock(
        confirmationTitle(mode, blockName),
        confirmationMessage(mode, blockKind, parsedMinutes, parsedRandomTextLength),
      ));
    if (!confirmed) return;

    const descriptor: BlockDescriptor = { name: blockName, kind: blockKind };
    const result = await executeCli({
      args: buildStartArgs({
        blockName,
        mode,
        minutes: parsedMinutes,
        password,
        randomTextLength: parsedRandomTextLength,
      }),
      workingTitle: `Starting ${blockName}…`,
      successTitle: blockKind === "device" ? `Enabled ${blockName}` : `Started ${blockName}`,
      verification: {
        type: "state",
        block: descriptor,
        expectedState: "enabled",
      },
      onSuccess: () => onSuccess?.(),
    });

    if (result) pop();
  }

  function clearErrors() {
    setMinutesError(undefined);
    setPasswordError(undefined);
    setRandomTextError(undefined);
  }

  return (
    <Form
      navigationTitle="Start Options"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle(mode)}
            icon={mode === "unlocked" ? Icon.LockUnlocked : Icon.Lock}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Block" text={blockName} />
      <Form.Description title="Type" text={blockKindLabel(blockKind)} />

      <Form.Dropdown
        id="mode"
        title="Start Option"
        value={mode}
        onChange={(value) => setMode(value as StartOptionMode)}
      >
        <Form.Dropdown.Item value="unlocked" title="Start Unlocked (No Lock)" icon={Icon.LockUnlocked} />
        <Form.Dropdown.Item value="as-is" title="Use Saved Settings" icon={Icon.ArrowClockwise} />
        <Form.Dropdown.Item value="timed" title="Timed Lock" icon={Icon.Clock} />
        <Form.Dropdown.Item value="password" title="Password Lock" icon={Icon.Key} />
        <Form.Dropdown.Item value="random-text" title="Random Text Lock" icon={Icon.Text} />
      </Form.Dropdown>

      {mode === "unlocked" ? (
        <Form.Description
          title="No Lock"
          text={
            blockKind === "device"
              ? "Enables the device block's schedule without applying a lock. Depending on Cold Turkey's configuration, this may trigger the configured device action."
              : "Starts the block without a lock, so it can be stopped normally later."
          }
        />
      ) : null}

      {mode === "as-is" ? (
        <Form.Description
          title="Saved Settings"
          text="Uses the block's previously configured block type and lock. This can re-apply a lock."
        />
      ) : null}

      {mode === "timed" ? (
        <>
          <Form.TextField
            id="minutes"
            title="Lock Duration"
            placeholder="60"
            value={minutes}
            onChange={(value) => {
              setMinutes(value);
              setMinutesError(undefined);
            }}
            error={minutesError}
            info="Minutes. Cold Turkey rejects a value shorter than any remaining timed lock."
          />
          {blockKind === "device" ? (
            <Form.Description
              title="Immediate Device Action"
              text="For a device block, a timed lock may immediately lock the screen, sign out, or shut down, depending on the block's configured type."
            />
          ) : null}
        </>
      ) : null}

      {mode === "password" ? (
        <>
          <Form.PasswordField
            id="password"
            title="Block Password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setPasswordError(undefined);
            }}
            error={passwordError}
            info="The password is passed as one process argument and is not stored by the extension."
          />
          {blockKind === "device" ? (
            <Form.Description
              title="Device Requirement"
              text="Cold Turkey 4.9 only supports password locks for scheduled device blocks."
            />
          ) : null}
        </>
      ) : null}

      {mode === "random-text" ? (
        <>
          <Form.TextField
            id="randomTextLength"
            title="Random Text Length"
            placeholder="100"
            value={randomTextLength}
            onChange={(value) => {
              setRandomTextLength(value);
              setRandomTextError(undefined);
            }}
            error={randomTextError}
            info="Whole number between 1 and 999. This creates a lock, not a random-text break."
          />
          {blockKind === "device" ? (
            <Form.Description
              title="Device Requirement"
              text="Cold Turkey 4.9 only supports random-text locks for scheduled device blocks."
            />
          ) : null}
        </>
      ) : null}
    </Form>
  );
}

function parseWholeNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isValidCliPassword(value: string): boolean {
  return value.length > 0 && !value.includes("\0");
}

function submitTitle(mode: StartOptionMode): string {
  switch (mode) {
    case "unlocked":
      return "Start Unlocked";
    case "as-is":
      return "Start with Saved Settings";
    case "timed":
      return "Start and Lock";
    case "password":
      return "Start with Password";
    case "random-text":
      return "Start with Random Text";
  }
}

function confirmationTitle(mode: StartOptionMode, blockName: string): string {
  if (mode === "unlocked") return `Start ${blockName} unlocked?`;
  if (mode === "as-is") return `Start ${blockName} with saved settings?`;
  return `Start and lock ${blockName}?`;
}

function confirmationMessage(
  mode: StartOptionMode,
  kind: BlockKind,
  minutes?: number,
  randomTextLength?: number,
): string {
  switch (mode) {
    case "unlocked":
      return kind === "device"
        ? "The device block schedule will be enabled without applying a lock. Depending on Cold Turkey's configuration, this may trigger its device action."
        : "The block will start without a lock and can be stopped normally later.";
    case "as-is":
      return "The saved settings may include a lock that prevents stopping or editing the block until its conditions are met.";
    case "timed":
      return kind === "device"
        ? `The device action may occur immediately and remain in effect for ${minutes ?? "the selected number of"} minute(s).`
        : `The block will be locked for ${minutes ?? "the selected number of"} minute(s).`;
    case "password":
      return "The block will require the supplied password to stop. Keep the password somewhere appropriate.";
    case "random-text":
      return `Stopping or editing may require entering ${randomTextLength ?? "the selected number of"} random characters.`;
  }
}
