import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  parseSSHConnectionString,
  hostExistsByUser,
  appendHostToConfig,
} from "./lib/ssh-config";
import { HostGroup, setHostGroups } from "./lib/groups";

interface AddHostFormProps {
  groups: HostGroup[];
  onHostAdded: () => void;
}

export function AddHostForm({ groups, onHostAdded }: AddHostFormProps) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const defaultIdentity = prefs.defaultIdentityFile || "";

  const [sshCommand, setSSHCommand] = useState("");
  const [alias, setAlias] = useState("");
  const [parsed, setParsed] = useState<{
    user: string;
    hostname: string;
    port: number;
    identityFile?: string;
  } | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  function handleCommandChange(value: string) {
    setSSHCommand(value);
    setError(undefined);

    const result = parseSSHConnectionString(value);
    if (result) {
      setParsed({
        user: result.user,
        hostname: result.hostname,
        port: result.port,
        identityFile: result.identityFile,
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

    const identityFile = parsed.identityFile || defaultIdentity || undefined;

    try {
      appendHostToConfig(
        finalAlias,
        parsed.hostname,
        parsed.user,
        parsed.port,
        identityFile,
      );

      if (selectedGroups.length > 0) {
        await setHostGroups(finalAlias, selectedGroups);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Host added",
        message: `Added "${finalAlias}" to ~/.ssh/config`,
      });
      onHostAdded();
      pop();
    } catch (e: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to write SSH config",
        message: String(e),
      });
    }
  }

  const identitySource = parsed?.identityFile
    ? `Identity file: ${parsed.identityFile} (from SSH command)`
    : defaultIdentity
      ? `Identity file: ${defaultIdentity} (from preferences)`
      : "No identity file specified.";

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
        placeholder="ssh user@hostname -p 22 -i ~/.ssh/key"
        value={sshCommand}
        onChange={handleCommandChange}
        error={error}
        info="Paste the SSH connection string. Supports -p (port) and -i (identity file)."
      />
      <Form.TextField
        id="alias"
        title="Host Alias"
        placeholder="my-gpu-host"
        value={alias}
        onChange={setAlias}
        info="Short name used in SSH config and shown in the fleet list."
      />
      {groups.length > 0 && (
        <Form.TagPicker
          id="groups"
          title="Groups"
          value={selectedGroups}
          onChange={setSelectedGroups}
          info="Assign this host to one or more groups."
        >
          {groups.map((g) => (
            <Form.TagPicker.Item key={g.id} value={g.id} title={g.name} />
          ))}
        </Form.TagPicker>
      )}
      {parsed && (
        <Form.Description
          title="Parsed"
          text={`User: ${parsed.user}\nHost: ${parsed.hostname}\nPort: ${parsed.port}\n${identitySource}`}
        />
      )}
    </Form>
  );
}
