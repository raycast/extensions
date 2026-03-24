import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { CustomAction } from "../api/custom-actions/custom-actions.types";
import { saveCustomAction } from "../api/custom-actions/custom-actions.service";
import { useObsidianVaults } from "../utils/hooks";

interface ActionFormProps {
  action?: CustomAction;
  onSave?: () => void;
}

export function ActionForm({ action, onSave }: ActionFormProps) {
  const { pop } = useNavigation();
  const { vaults } = useObsidianVaults();

  const [title, setTitle] = useState(action?.title ?? "");
  const [description, setDescription] = useState(action?.description ?? "");
  const [vaultName, setVaultName] = useState(action?.vaultName ?? (vaults.length > 0 ? vaults[0].name : ""));
  const [path, setPath] = useState(action?.path ?? "");
  const [type, setType] = useState<CustomAction["type"]>(action?.type ?? "capture");
  // Default template for capture mode is {content} if not specified, otherwise empty
  const [template, setTemplate] = useState(action?.template ?? (action ? "" : "{content}"));
  const [mode, setMode] = useState<CustomAction["mode"]>(action?.mode ?? "append");
  const [heading, setHeading] = useState(action?.heading ?? "");
  const [silent, setSilent] = useState(action?.silent ?? false);

  async function handleSubmit() {
    if (!title) {
      showToast(Toast.Style.Failure, "Title is required");
      return;
    }
    if (!path) {
      showToast(Toast.Style.Failure, "Path is required");
      return;
    }

    const newAction: CustomAction = {
      id: action?.id ?? uuidv4(),
      title,
      description,
      vaultName,
      path,
      type,
      template,
      mode,
      heading,
      silent,
    };

    await saveCustomAction(newAction);
    showToast(Toast.Style.Success, "Action saved");
    onSave?.();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={action ? "Update Action" : "Create Action"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Action Title"
        placeholder="e.g. Log Meeting"
        value={title}
        onChange={setTitle}
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g. Appends to meeting notes with current date"
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown id="vault" title="Vault" value={vaultName} onChange={setVaultName}>
        {vaults.map((vault) => (
          <Form.Dropdown.Item key={vault.key} value={vault.name} title={vault.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="path"
        title="Note Path"
        placeholder="e.g. Daily Notes/{date}.md"
        value={path}
        onChange={setPath}
        info="Supports date variables like {date}, {year}, {month}..."
      />

      <Form.Dropdown
        id="type"
        title="Action Type"
        value={type}
        onChange={(val) => {
          const newType = val as CustomAction["type"];
          setType(newType);
          if (newType === "capture" && template === "") {
            setTemplate("{content}");
          }
        }}
        info={
          type === "capture"
            ? "Input text is wrapped in template ({content})."
            : "Template is loaded into input for editing."
        }
      >
        <Form.Dropdown.Item value="capture" title="Capture text" />
        <Form.Dropdown.Item value="template" title="Pre-fill with template" />
      </Form.Dropdown>

      <Form.TextArea
        id="template"
        title="Template"
        placeholder="Content to append..."
        value={template}
        onChange={setTemplate}
        info="Supports {clipboard}, {time}..."
      />

      <Form.Dropdown id="mode" title="Mode" value={mode} onChange={(val) => setMode(val as CustomAction["mode"])}>
        <Form.Dropdown.Item value="append" title="Append" />
        <Form.Dropdown.Item value="prepend" title="Prepend" />
      </Form.Dropdown>

      <Form.TextField
        id="heading"
        title="Target Heading"
        placeholder="Optional heading to find"
        value={heading}
        onChange={setHeading}
      />

      <Form.Checkbox id="silent" label="Open in background" value={silent} onChange={setSilent} />
    </Form>
  );
}
