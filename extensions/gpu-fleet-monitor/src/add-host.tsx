import { Action, ActionPanel, Form, Icon, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { parseSSHConnectionString, hostExistsByUser, appendHostToConfig } from "./lib/ssh-config";
import { HostGroup, setHostGroups, addGroup, generateGroupId } from "./lib/groups";

interface DraftGroup {
  id: string;
  name: string;
}

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
  const [drafts, setDrafts] = useState<DraftGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState("");

  const allItems = [
    ...groups.map((g) => ({ id: g.id, name: g.name })),
    ...drafts.map((d) => ({ id: d.id, name: d.name })),
  ];

  const selectedItems = allItems.filter((g) => selectedGroups.includes(g.id));
  const unselectedItems = allItems.filter((g) => !selectedGroups.includes(g.id));

  const trimmedSearch = groupSearch.trim().toLowerCase();
  const showCreate = trimmedSearch.length > 0 && !allItems.some((g) => g.name.toLowerCase() === trimmedSearch);

  const filteredUnselected =
    trimmedSearch.length > 0
      ? unselectedItems.filter((g) => g.name.toLowerCase().includes(trimmedSearch))
      : unselectedItems;

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
      setError("Could not parse SSH command. Expected format: ssh user@host -p port");
    }
  }

  function handleGroupSelect(value: string) {
    if (value === "__none") return;

    if (value === "__create") {
      const name = groupSearch.trim();
      if (!name) return;
      const draftId = "draft_" + Date.now().toString(36);
      setDrafts((prev) => [...prev, { id: draftId, name }]);
      setSelectedGroups((prev) => [...prev, draftId]);
    } else if (selectedGroups.includes(value)) {
      setSelectedGroups((prev) => prev.filter((id) => id !== value));
      setDrafts((prev) => prev.filter((d) => d.id !== value));
    } else {
      setSelectedGroups((prev) => [...prev, value]);
    }

    setGroupSearch("");
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
      appendHostToConfig(finalAlias, parsed.hostname, parsed.user, parsed.port, identityFile);

      const finalGroupIds: string[] = [];
      for (const id of selectedGroups) {
        const draft = drafts.find((d) => d.id === id);
        if (draft) {
          const realId = generateGroupId();
          await addGroup({
            id: realId,
            name: draft.name,
            patterns: [],
            identityFiles: [],
          });
          finalGroupIds.push(realId);
        } else {
          finalGroupIds.push(id);
        }
      }

      if (finalGroupIds.length > 0) {
        await setHostGroups(finalAlias, finalGroupIds);
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

  const groupLabel = selectedItems.length > 0 ? selectedItems.map((g) => g.name).join(", ") : "None";

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
      <Form.Dropdown
        id="groups"
        title={`Groups (${groupLabel})`}
        value="__none"
        onChange={handleGroupSelect}
        onSearchTextChange={setGroupSearch}
        filtering={false}
        info="Select groups or type a new name to create one. Tap a selected group to remove it."
      >
        <Form.Dropdown.Item value="__none" title="Search or create group..." icon={Icon.MagnifyingGlass} />
        {showCreate && (
          <Form.Dropdown.Item value="__create" title={`Create "${groupSearch.trim()}"`} icon={Icon.PlusCircle} />
        )}
        {selectedItems.length > 0 && (
          <Form.Dropdown.Section title="Selected">
            {selectedItems.map((g) => (
              <Form.Dropdown.Item key={g.id} value={g.id} title={g.name} icon={Icon.CheckCircle} />
            ))}
          </Form.Dropdown.Section>
        )}
        {filteredUnselected.length > 0 && (
          <Form.Dropdown.Section title={selectedItems.length > 0 ? "Available" : undefined}>
            {filteredUnselected.map((g) => (
              <Form.Dropdown.Item key={g.id} value={g.id} title={g.name} icon={Icon.Circle} />
            ))}
          </Form.Dropdown.Section>
        )}
      </Form.Dropdown>
      {parsed && (
        <Form.Description
          title="Parsed"
          text={[`User: ${parsed.user}`, `Host: ${parsed.hostname}`, `Port: ${parsed.port}`, identitySource].join("\n")}
        />
      )}
    </Form>
  );
}
