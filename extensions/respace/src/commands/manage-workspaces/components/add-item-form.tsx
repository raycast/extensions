import type { Application } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getApplications,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type {
  WorkspaceItem,
  WorkspaceItemType,
} from "../../../types/workspace";
import { getPathLabel, getPathPlaceholder } from "../utils/workspace-helpers";

interface AddItemFormProps {
  onItemAdded: (item: Omit<WorkspaceItem, "id">) => void;
}

export function AddItemForm({ onItemAdded }: AddItemFormProps) {
  const [type, setType] = useState<WorkspaceItemType>("app");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [delay, setDelay] = useState("0");
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  useEffect(() => {
    async function loadApps() {
      try {
        const installedApps = await getApplications();
        const sorted = installedApps
          .filter((app) => app.name && app.path)
          .sort((a, b) => a.name.localeCompare(b.name));
        setApplications(sorted);
      } catch (error) {
        console.error("Failed to load applications", error);
      } finally {
        setIsLoadingApps(false);
      }
    }

    loadApps();
  }, []);

  useEffect(() => {
    setPath("");
  }, []);

  async function handleSubmit() {
    if (!name.trim() || !path.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name and path are required",
      });
      return;
    }

    const delayMs = Number.parseInt(delay, 10) || 0;

    onItemAdded({
      type,
      name: name.trim(),
      path: path.trim(),
      delay: delayMs > 0 ? delayMs : undefined,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Item added",
      message: name,
    });
  }

  return (
    <Form
      navigationTitle="Add Item"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Item"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="type"
        title="Type"
        value={type}
        onChange={(value) => setType(value as WorkspaceItemType)}
      >
        <Form.Dropdown.Item
          value="app"
          title="Application"
          icon={Icon.AppWindow}
        />
        <Form.Dropdown.Item value="folder" title="Folder" icon={Icon.Folder} />
        <Form.Dropdown.Item value="file" title="File" icon={Icon.Document} />
        <Form.Dropdown.Item value="url" title="URL" icon={Icon.Globe} />
        <Form.Dropdown.Item
          value="terminal"
          title="Terminal Command"
          icon={Icon.Terminal}
        />
      </Form.Dropdown>
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Item name"
        value={name}
        onChange={setName}
      />
      {type === "app" && applications.length > 0 ? (
        <Form.Dropdown
          id="path"
          title="Application"
          value={path}
          isLoading={isLoadingApps}
          onChange={(value) => {
            setPath(value);
            if (!name.trim()) {
              const selected = applications.find((app) => app.path === value);
              if (selected) {
                setName(selected.name);
              }
            }
          }}
        >
          <Form.Dropdown.Item value="" title="Select an application" />
          <Form.Dropdown.Section title="Installed Applications">
            {applications.map((app) => (
              <Form.Dropdown.Item
                key={app.path}
                value={app.path}
                title={app.name}
                icon={{ fileIcon: app.path }}
              />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}
      {type === "app" && applications.length === 0 ? (
        <Form.TextField
          id="path"
          title="Application Name"
          placeholder={getPathPlaceholder(type)}
          value={path}
          onChange={setPath}
        />
      ) : null}
      {type === "folder" ? (
        <Form.FilePicker
          id="path"
          title="Folder"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          value={path ? [path] : []}
          onChange={(value) => setPath(value?.[0] ?? "")}
        />
      ) : null}
      {type === "file" ? (
        <Form.FilePicker
          id="path"
          title="File"
          canChooseFiles
          canChooseDirectories={false}
          allowMultipleSelection={false}
          value={path ? [path] : []}
          onChange={(value) => setPath(value?.[0] ?? "")}
        />
      ) : null}
      {type === "url" || type === "terminal" ? (
        <Form.TextField
          id="path"
          title={getPathLabel(type)}
          placeholder={getPathPlaceholder(type)}
          value={path}
          onChange={setPath}
        />
      ) : null}
      <Form.TextField
        id="delay"
        title="Launch Delay (ms)"
        placeholder="0 (no delay)"
        value={delay}
        onChange={setDelay}
        info="Optional delay in milliseconds before launching this item"
      />
    </Form>
  );
}
