import {
  Action,
  ActionPanel,
  Form,
  Icon,
  useNavigation,
  showToast,
  Toast,
  getApplications,
  Application,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  RootConfig,
  ActionOrGroup,
  Group,
  Action as ActionItem,
  ActionType,
  isGroup,
} from "./types";
import {
  addItemToGroup,
  updateItem,
  findGroupByPath,
  generateId,
  checkKeyConflict,
} from "./storage";
import { getActionIcon, getActionTypeLabel } from "./actions";

export interface AddItemFormProps {
  config: RootConfig;
  parentPath: string[];
  itemType: "action" | "group";
  onSave: (config: RootConfig) => Promise<void>;
}

export function AddItemForm({
  config,
  parentPath,
  itemType,
  onSave,
}: AddItemFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("application");
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  const parentGroup =
    parentPath.length === 0 ? config : findGroupByPath(config, parentPath);

  useEffect(() => {
    async function loadApps() {
      const apps = await getApplications();
      apps.sort((a, b) => a.name.localeCompare(b.name));
      setApplications(apps);
      setIsLoadingApps(false);
    }
    loadApps();
  }, []);

  async function handleSubmit(values: {
    key: string;
    label: string;
    actionType?: string;
    value?: string;
    appValue?: string;
    browser?: string;
  }) {
    setIsSubmitting(true);

    const key = values.key.slice(0, 1);

    if (!key) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Key required",
        message: "Please enter a single character key",
      });
      setIsSubmitting(false);
      return;
    }

    if (parentGroup) {
      const conflict = checkKeyConflict(parentGroup, key);
      if (conflict.hasConflict) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key conflict",
          message: `Key "${key}" is already used by "${conflict.conflictLabel}"`,
        });
        setIsSubmitting(false);
        return;
      }
    }

    let newItem: ActionOrGroup;

    if (itemType === "group") {
      newItem = {
        id: generateId(),
        key,
        type: "group",
        label: values.label || undefined,
        actions: [],
        browser: values.browser || undefined,
      } as Group;
    } else {
      const value =
        values.actionType === "application" ? values.appValue : values.value;
      if (!value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Value required",
          message: "Please enter a value for this action",
        });
        setIsSubmitting(false);
        return;
      }

      newItem = {
        id: generateId(),
        key,
        type: (values.actionType || "application") as ActionType,
        label: values.label || undefined,
        value,
        ...(values.actionType === "url" && values.browser
          ? { browser: values.browser }
          : {}),
      } as ActionItem;
    }

    const newConfig = await addItemToGroup(config, parentPath, newItem);
    await onSave(newConfig);
    await showToast({ style: Toast.Style.Success, title: "Item added" });
    pop();
  }

  const targetConfig = getTargetConfig(actionType);

  return (
    <Form
      isLoading={isSubmitting || isLoadingApps}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={itemType === "group" ? "Add Group" : "Add Action"}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="key"
        title="Key"
        placeholder="Single character (e.g., t, o, r)"
        info="The key to press to trigger this item"
      />
      <Form.TextField
        id="label"
        title="Label"
        placeholder={
          itemType === "group" ? "e.g., Applications" : "e.g., Terminal"
        }
        info="Display name for this item"
      />

      {itemType === "group" && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="browser"
            title="Default Browser"
            info="URLs in this group will open with this browser unless overridden by the individual action"
          >
            <Form.Dropdown.Item
              value=""
              title="System Default"
              icon={Icon.Globe}
            />
            {applications.map((app) => (
              <Form.Dropdown.Item
                key={app.bundleId || app.path}
                value={app.path}
                title={app.name}
                icon={{ fileIcon: app.path }}
              />
            ))}
          </Form.Dropdown>
        </>
      )}

      {itemType === "action" && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="actionType"
            title="Action Type"
            defaultValue="application"
            onChange={(value) => setActionType(value as ActionType)}
          >
            <Form.Dropdown.Item
              value="application"
              title={getActionTypeLabel("application")}
              icon={getActionIcon("application")}
            />
            <Form.Dropdown.Item
              value="url"
              title={getActionTypeLabel("url")}
              icon={getActionIcon("url")}
            />
            <Form.Dropdown.Item
              value="folder"
              title={getActionTypeLabel("folder")}
              icon={getActionIcon("folder")}
            />
            <Form.Dropdown.Item
              value="command"
              title={getActionTypeLabel("command")}
              icon={getActionIcon("command")}
            />
          </Form.Dropdown>

          {actionType === "application" ? (
            <Form.Dropdown
              id="appValue"
              title={targetConfig.title}
              info={targetConfig.info}
            >
              {applications.map((app) => (
                <Form.Dropdown.Item
                  key={app.bundleId || app.path}
                  value={app.path}
                  title={app.name}
                  icon={{ fileIcon: app.path }}
                />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.TextField
              id="value"
              title={targetConfig.title}
              placeholder={targetConfig.placeholder}
              info={targetConfig.info}
            />
          )}

          {actionType === "url" && (
            <Form.Dropdown
              id="browser"
              title="Open With"
              info="Choose which browser to open this URL with. System Default inherits from the parent group or OS default."
            >
              <Form.Dropdown.Item
                value=""
                title="System Default"
                icon={Icon.Globe}
              />
              {applications.map((app) => (
                <Form.Dropdown.Item
                  key={app.bundleId || app.path}
                  value={app.path}
                  title={app.name}
                  icon={{ fileIcon: app.path }}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}

export interface EditItemFormProps {
  config: RootConfig;
  itemPath: string[];
  onSave: (config: RootConfig) => Promise<void>;
}

export function EditItemForm({ config, itemPath, onSave }: EditItemFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("application");
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  const parentPath = itemPath.slice(0, -1);
  const itemId = itemPath[itemPath.length - 1];
  const parentGroup =
    parentPath.length === 0 ? config : findGroupByPath(config, parentPath);
  const item = parentGroup?.actions.find((a: ActionOrGroup) => a.id === itemId);

  useEffect(() => {
    async function loadApps() {
      const apps = await getApplications();
      apps.sort((a, b) => a.name.localeCompare(b.name));
      setApplications(apps);
      setIsLoadingApps(false);
    }
    loadApps();
  }, []);

  useEffect(() => {
    if (item && !isGroup(item)) {
      setActionType(item.type);
    }
  }, [item]);

  if (!item) {
    return null;
  }

  const isGroupItem = isGroup(item);

  async function handleSubmit(values: {
    key: string;
    label: string;
    actionType?: string;
    value?: string;
    appValue?: string;
    browser?: string;
  }) {
    setIsSubmitting(true);

    const key = values.key.slice(0, 1);

    if (!key) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Key required",
        message: "Please enter a single character key",
      });
      setIsSubmitting(false);
      return;
    }

    if (parentGroup && key !== item!.key) {
      const conflict = checkKeyConflict(parentGroup, key, item!.id);
      if (conflict.hasConflict) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key conflict",
          message: `Key "${key}" is already used by "${conflict.conflictLabel}"`,
        });
        setIsSubmitting(false);
        return;
      }
    }

    let updates: Partial<ActionItem> | Partial<Group>;

    if (isGroupItem) {
      updates = {
        key,
        label: values.label || undefined,
        browser: values.browser || undefined,
      };
    } else {
      const value =
        values.actionType === "application" ? values.appValue : values.value;
      if (!value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Value required",
          message: "Please enter a value for this action",
        });
        setIsSubmitting(false);
        return;
      }

      updates = {
        key,
        type: (values.actionType || "application") as ActionType,
        label: values.label || undefined,
        value,
        browser:
          values.actionType === "url" ? values.browser || undefined : undefined,
      };
    }

    const newConfig = await updateItem(config, itemPath, updates);
    await onSave(newConfig);
    await showToast({ style: Toast.Style.Success, title: "Item updated" });
    pop();
  }

  const targetConfig = getTargetConfig(actionType);

  return (
    <Form
      isLoading={isSubmitting || isLoadingApps}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="key"
        title="Key"
        defaultValue={item.key}
        placeholder="Single character (e.g., t, o, r)"
        info="The key to press to trigger this item"
      />
      <Form.TextField
        id="label"
        title="Label"
        defaultValue={item.label || ""}
        placeholder={isGroupItem ? "e.g., Applications" : "e.g., Terminal"}
        info="Display name for this item"
      />

      {isGroupItem && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="browser"
            title="Default Browser"
            defaultValue={(item as Group).browser || ""}
            info="URLs in this group will open with this browser unless overridden by the individual action"
          >
            <Form.Dropdown.Item
              value=""
              title="System Default"
              icon={Icon.Globe}
            />
            {applications.map((app) => (
              <Form.Dropdown.Item
                key={app.bundleId || app.path}
                value={app.path}
                title={app.name}
                icon={{ fileIcon: app.path }}
              />
            ))}
          </Form.Dropdown>
        </>
      )}

      {!isGroupItem && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="actionType"
            title="Action Type"
            defaultValue={(item as ActionItem).type}
            onChange={(value) => setActionType(value as ActionType)}
          >
            <Form.Dropdown.Item
              value="application"
              title={getActionTypeLabel("application")}
              icon={getActionIcon("application")}
            />
            <Form.Dropdown.Item
              value="url"
              title={getActionTypeLabel("url")}
              icon={getActionIcon("url")}
            />
            <Form.Dropdown.Item
              value="folder"
              title={getActionTypeLabel("folder")}
              icon={getActionIcon("folder")}
            />
            <Form.Dropdown.Item
              value="command"
              title={getActionTypeLabel("command")}
              icon={getActionIcon("command")}
            />
          </Form.Dropdown>

          {actionType === "application" ? (
            <Form.Dropdown
              id="appValue"
              title={targetConfig.title}
              defaultValue={(item as ActionItem).value}
              info={targetConfig.info}
            >
              {applications.map((app) => (
                <Form.Dropdown.Item
                  key={app.bundleId || app.path}
                  value={app.path}
                  title={app.name}
                  icon={{ fileIcon: app.path }}
                />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.TextField
              id="value"
              title={targetConfig.title}
              defaultValue={(item as ActionItem).value}
              placeholder={targetConfig.placeholder}
              info={targetConfig.info}
            />
          )}

          {actionType === "url" && (
            <Form.Dropdown
              id="browser"
              title="Open With"
              defaultValue={(item as ActionItem).browser || ""}
              info="Choose which browser to open this URL with. System Default inherits from the parent group or OS default."
            >
              <Form.Dropdown.Item
                value=""
                title="System Default"
                icon={Icon.Globe}
              />
              {applications.map((app) => (
                <Form.Dropdown.Item
                  key={app.bundleId || app.path}
                  value={app.path}
                  title={app.name}
                  icon={{ fileIcon: app.path }}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}

function getTargetConfig(actionType: ActionType): {
  title: string;
  placeholder: string;
  info: string;
} {
  switch (actionType) {
    case "application":
      return {
        title: "Application",
        placeholder: "Select an application",
        info: "Choose the application to open",
      };
    case "url":
      return {
        title: "URL",
        placeholder: "https://example.com or raycast://...",
        info: "The URL to open (supports raycast:// deeplinks)",
      };
    case "folder":
      return {
        title: "Folder Path",
        placeholder: "/path/to/folder or ~/Documents",
        info: "The folder path to open in file manager",
      };
    case "command":
      return {
        title: "Shell Command",
        placeholder: "echo 'Hello World'",
        info: "The shell command to execute",
      };
  }
}
