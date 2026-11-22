import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { logout, unlockCommand, unlockSession } from "./pass-cli";
import { PassCliError } from "./types";

const TOO_MANY_CODES = "Too many wrong codes log you out of pass-cli.";

interface SessionLockedViewProps {
  /** Runs once unlocked, logged out, or for Check Again. */
  reload: () => void | Promise<void>;
}

/**
 * The session has a lock code and is locked: Proton refuses every command until it's unlocked. On macOS the code is
 * typed here, and goes to pass-cli's own prompt; elsewhere, pass-cli can only get it in a terminal.
 */
export function SessionLockedView({ reload }: SessionLockedViewProps) {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  async function run(task: () => Promise<void>) {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  }

  const unlock = () =>
    run(async () => {
      if (!code) {
        setCodeError("Enter your lock code");
        return;
      }
      const typed = code;
      // Whatever happens, the code doesn't stay on screen.
      setCode("");
      const toast = await showToast({ style: Toast.Style.Animated, title: "Unlocking Session" });
      try {
        await unlockSession(typed);
        toast.style = Toast.Style.Success;
        toast.title = "Session Unlocked";
        await reload();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        if (error instanceof PassCliError && error.type === "not_authenticated") {
          // E.g. after too many wrong codes: the login screen follows.
          toast.title = "Logged Out";
          toast.message = "pass-cli ended the session. Log in again.";
          await reload();
          return;
        }
        toast.title = "Couldn't Unlock";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    });

  const checkAgain = () => run(async () => reload());

  const logOut = () =>
    run(async () => {
      const confirmed = await confirmAlert({
        title: "Log Out of pass-cli?",
        message:
          "This removes the session from this computer, lock code included. pass-cli shares it with the terminal, so it will need a new login there too.",
        primaryAction: { title: "Log Out", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Logging Out" });
      try {
        // Ending a locked session on Proton's servers is refused: it's removed from this computer only.
        await logout(true);
        toast.style = Toast.Style.Success;
        toast.title = "Logged Out";
        await reload();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't Log Out";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    });

  const checkAgainAction = (
    <Action
      title="Check Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={checkAgain}
    />
  );
  const logOutAction = <Action title="Logout" icon={Icon.Logout} style={Action.Style.Destructive} onAction={logOut} />;

  if (process.platform !== "darwin") {
    const copyCommand = async () => {
      await Clipboard.copy(await unlockCommand());
      await showHUD("Unlock Command Copied");
    };
    return (
      <List isLoading={isBusy}>
        <List.EmptyView
          icon={Icon.Lock}
          title="Session Locked"
          description={`Your pass-cli session is locked. Copy the unlock command, run it in PowerShell and enter your lock code there, then choose Check Again. ${TOO_MANY_CODES}`}
          actions={
            <ActionPanel>
              <Action title="Copy Unlock Command" icon={Icon.Clipboard} onAction={copyCommand} />
              {checkAgainAction}
              {logOutAction}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Session Locked"
      isLoading={isBusy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Unlock Session" icon={Icon.LockUnlocked} onSubmit={unlock} />
          {checkAgainAction}
          {logOutAction}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Session Locked"
        text="Your pass-cli session is locked. Enter your lock code to unlock it."
      />
      <Form.PasswordField
        id="code"
        title="Lock Code"
        value={code}
        error={codeError}
        autoFocus
        onChange={(value) => {
          setCode(value);
          if (value) setCodeError(undefined);
        }}
      />
      <Form.Description text={`${TOO_MANY_CODES} Forgot your code? Choose Logout in the Actions, then log in again.`} />
    </Form>
  );
}
