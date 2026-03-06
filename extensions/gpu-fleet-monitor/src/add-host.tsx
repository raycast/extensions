import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import {
  parseSSHConnectionString,
  hostExistsByUser,
  appendHostToConfig,
} from "./lib/ssh-config";
export default function AddHost() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultIdentity = prefs.defaultIdentityFile || "";

  const [sshCommand, setSSHCommand] = useState("");
  const [alias, setAlias] = useState("");
  const [parsed, setParsed] = useState<{
    user: string;
    hostname: string;
    port: number;
  } | null>(null);
  const [error, setError] = useState<string | undefined>();

  function handleCommandChange(value: string) {
    setSSHCommand(value);
    setError(undefined);

    const result = parseSSHConnectionString(value);
    if (result) {
      setParsed({
        user: result.user,
        hostname: result.hostname,
        port: result.port,
      });
      if (!alias || alias === "") {
        setAlias(result.alias);
      }
    } else if (value.trim().length > 0) {
      setParsed(null);
      setError(
        "Could not parse SSH command. Expected format: ssh user@host -p port",
      );
    }
  }

  async function handleSubmit() {
    if (!parsed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid SSH command",
        message: "Paste a valid SSH connection string first",
      });
      return;
    }

    const finalAlias = alias.trim();
    if (!finalAlias) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Alias required",
        message: "Enter a host alias",
      });
      return;
    }

    const existing = hostExistsByUser(parsed.user, parsed.hostname);
    if (existing) {
      await showToast({
        style: Toast.Style.Success,
        title: "Host already exists",
        message: `${parsed.user}@${parsed.hostname} is already in SSH config as "${existing}"`,
      });
      return;
    }

    try {
      appendHostToConfig(
        finalAlias,
        parsed.hostname,
        parsed.user,
        parsed.port,
        defaultIdentity || undefined,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Host added",
        message: `Added "${finalAlias}" to ~/.ssh/config`,
      });
      await popToRoot();
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to write SSH config",
        message: String(e),
      });
    }
  }

  const identityHint = defaultIdentity
    ? `Identity file: ${defaultIdentity} (set in extension preferences)`
    : "No default identity file configured. Set one in extension preferences if needed.";

  return (
    <Form
      navigationTitle="Add SSH Host"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Host" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sshCommand"
        title="SSH Command"
        placeholder="ssh user@hostname -p 22"
        value={sshCommand}
        onChange={handleCommandChange}
        error={error}
        info="Paste the SSH connection string. The host will be added to ~/.ssh/config."
      />
      <Form.TextField
        id="alias"
        title="Host Alias"
        placeholder="my-gpu-host"
        value={alias}
        onChange={setAlias}
        info="Short name used in SSH config and shown in the fleet list."
      />
      {parsed && (
        <Form.Description
          title="Parsed"
          text={`User: ${parsed.user}\nHost: ${parsed.hostname}\nPort: ${parsed.port}\n${identityHint}`}
        />
      )}
    </Form>
  );
}
