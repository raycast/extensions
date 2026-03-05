import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Form,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Environment, Color } from "./types";
import {
  getEnvironments,
  addEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from "./storage";
import { COLOR_MAP, COLOR_OPTIONS, generateId } from "./utils";

export default function ManageEnvironments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function load() {
    setIsLoading(true);
    setEnvironments(await getEnvironments());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(env: Environment) {
    const confirmed = await confirmAlert({
      title: `Delete "${env.name}"?`,
      message:
        "This will remove the environment. Existing deployment records will be kept but orphaned.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteEnvironment(env.id);
    await showToast({
      style: Toast.Style.Success,
      title: `Deleted "${env.name}"`,
    });
    load();
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage Environments">
      {!isLoading && environments.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No environments yet"
          description="Press ⌘N to add your first environment."
        />
      )}
      {environments.map((env) => (
        <List.Item
          key={env.id}
          icon={{ source: Icon.Circle, tintColor: COLOR_MAP[env.color] }}
          title={env.name}
          subtitle={env.description}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Pencil}
                title="Edit Environment"
                onAction={() =>
                  push(<EnvironmentForm existing={env} onSaved={load} />)
                }
              />
              <Action
                icon={Icon.Plus}
                title="Add New Environment"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => push(<EnvironmentForm onSaved={load} />)}
              />
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Delete Environment"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(env)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && (
        <List.Item
          icon={Icon.Plus}
          title="Add Environment"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                title="Add Environment"
                onAction={() => push(<EnvironmentForm onSaved={load} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function EnvironmentForm({
  existing,
  onSaved,
}: {
  existing?: Environment;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    name: string;
    color: Color;
    description: string;
  }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (existing) {
      await updateEnvironment({
        ...existing,
        name: values.name.trim(),
        color: values.color,
        description: values.description.trim() || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `Updated "${values.name.trim()}"`,
      });
    } else {
      await addEnvironment({
        id: generateId(),
        name: values.name.trim(),
        color: values.color,
        description: values.description.trim() || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `Added "${values.name.trim()}"`,
      });
    }

    onSaved();
    pop();
  }

  return (
    <Form
      navigationTitle={existing ? "Edit Environment" : "Add Environment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={existing ? Icon.Pencil : Icon.Plus}
            title={existing ? "Save Changes" : "Add Environment"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Production EU, Dev 1, Staging"
        defaultValue={existing?.name}
        info="A short identifier for this environment"
      />

      <Form.Dropdown
        id="color"
        title="Color"
        defaultValue={existing?.color ?? "blue"}
      >
        {COLOR_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.label}
            icon={{ source: Icon.Circle, tintColor: COLOR_MAP[opt.value] }}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g. AWS eu-west-1, customer-facing (optional)"
        defaultValue={existing?.description}
      />
    </Form>
  );
}
