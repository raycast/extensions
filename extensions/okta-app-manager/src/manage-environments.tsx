import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState } from "react";
import { addEnv, getConfig, removeEnv, setCurrentEnv, Config, OktaEnv } from "./api/config";

export default function ManageEnvironments() {
  const [config, setConfig] = useState<Config>(getConfig());

  function refresh() {
    setConfig(getConfig());
  }

  function handleActivate(name: string) {
    setCurrentEnv(name);
    refresh();
    showToast({ style: Toast.Style.Success, title: "Environment Active", message: name });
  }

  async function handleDelete(name: string) {
    if (
      await confirmAlert({
        title: `Delete environment "${name}"?`,
        message: "This action cannot be undone.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      removeEnv(name);
      refresh();
      showToast({ style: Toast.Style.Success, title: "Deleted", message: name });
    }
  }

  return (
    <List
      searchBarPlaceholder="Search environments..."
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Environment"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<EnvironmentForm onSave={refresh} />}
          />
        </ActionPanel>
      }
    >
      {Object.entries(config.envs).map(([name, env]) => {
        const isActive = config.current === name;
        return (
          <List.Item
            key={name}
            title={name}
            subtitle={env.domain}
            accessories={isActive ? [{ icon: Icon.CheckCircle, tooltip: "Active Environment" }] : []}
            actions={
              <ActionPanel>
                <Action title="Activate" icon={Icon.Check} onAction={() => handleActivate(name)} />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<EnvironmentForm name={name} env={env} onSave={refresh} />}
                />
                <Action.Push
                  title="Create Environment"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<EnvironmentForm onSave={refresh} />}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(name)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function EnvironmentForm({ name, env, onSave }: { name?: string; env?: OktaEnv; onSave: () => void }) {
  const { pop } = useNavigation();
  const [formName, setFormName] = useState(name || "");
  const [domain, setDomain] = useState(env?.domain || "");
  const [token, setToken] = useState(env?.token || "");

  function handleSubmit() {
    if (!formName || !domain || !token) {
      showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    // Check if renaming and key exists
    if (name && name !== formName) {
      removeEnv(name); // Remove old key if renaming
    }

    addEnv(formName, { domain, token });
    onSave();
    pop();
    showToast({ style: Toast.Style.Success, title: "Saved Environment", message: formName });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Production" value={formName} onChange={setFormName} />
      <Form.TextField
        id="domain"
        title="Okta Domain"
        placeholder="dev-123.okta.com"
        value={domain}
        onChange={setDomain}
      />
      <Form.PasswordField id="token" title="API Token" value={token} onChange={setToken} />
    </Form>
  );
}
