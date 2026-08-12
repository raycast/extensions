import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { AddAccountForm } from "./add-account";
import { saveAccount } from "./accounts";
import { generateCode, parseInput } from "./totp";

export default function QuickOTP() {
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  let code: ReturnType<typeof generateCode> | undefined;
  let error: string | undefined;
  if (secret.trim()) {
    try {
      code = generateCode(parseInput(secret, "Quick OTP"));
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
  }

  async function submit() {
    setIsLoading(true);
    try {
      const code = generateCode(parseInput(secret, "Quick OTP"));
      await Clipboard.copy(code.value, { concealed: true });
      await showHUD("OTP copied");
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not generate OTP", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Quick OTP"
      actions={
        <ActionPanel>
          <Action title="Copy OTP" icon={Icon.Clipboard} shortcut={{ modifiers: [], key: "return" }} onAction={submit} />
          <Action.Push title="Add Account" icon={Icon.Plus} target={<AddAccountForm initialSecret={secret} onAdd={saveAccount} />} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="secret"
        title="Secret or URI"
        placeholder="Base32 secret or otpauth://totp/..."
        value={secret}
        onChange={setSecret}
        autoFocus
      />
      <Form.Description
        title="Current OTP"
        text={code ? `${code.value} · expires in ${code.remainingSeconds}s` : (error ?? "Paste secret to get code")}
      />
    </Form>
  );
}
