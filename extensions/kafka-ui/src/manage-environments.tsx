import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getEnvironments, addEnvironment, updateEnvironment, deleteEnvironment, generateId } from "./storage";
import { ENV_COLOR_OPTIONS, EnvColorValue, StoredEnvironment } from "./types";
import { resolveEnvColor, COLOR_ICON_MAP } from "./colors";

interface EnvironmentFormValues {
  name: string;
  kafkaUiUrl: string;
  clusterName: string;
  topicPrefixes: string;
  color: string;
}

function EnvironmentForm({ environment, onSave }: { environment?: StoredEnvironment; onSave: () => void }) {
  const { pop } = useNavigation();
  const isEditing = !!environment;

  async function handleSubmit(values: EnvironmentFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    if (!values.kafkaUiUrl.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Kafka UI URL is required",
      });
      return;
    }
    if (!values.clusterName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cluster Name is required",
      });
      return;
    }

    const entry: StoredEnvironment = {
      id: environment?.id ?? generateId(),
      name: values.name.trim(),
      kafkaUiUrl: values.kafkaUiUrl.trim(),
      clusterName: values.clusterName.trim(),
      topicPrefixes: values.topicPrefixes?.trim() ?? "",
      color: (values.color as EnvColorValue) || "Blue",
    };

    if (isEditing) {
      await updateEnvironment(entry);
      await showToast({
        style: Toast.Style.Success,
        title: `Updated ${entry.name}`,
      });
    } else {
      await addEnvironment(entry);
      await showToast({
        style: Toast.Style.Success,
        title: `Added ${entry.name}`,
      });
    }

    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit ${environment.name}` : "Add Environment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Add Environment"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Production" defaultValue={environment?.name ?? ""} />
      <Form.TextField
        id="kafkaUiUrl"
        title="Kafka UI URL"
        placeholder="https://kafka-ui.example.com"
        defaultValue={environment?.kafkaUiUrl ?? ""}
      />
      <Form.TextField
        id="clusterName"
        title="Cluster Name"
        placeholder="my-cluster"
        defaultValue={environment?.clusterName ?? ""}
      />
      <Form.Separator />
      <Form.Dropdown id="color" title="Color" defaultValue={environment?.color ?? "Blue"}>
        {ENV_COLOR_OPTIONS.map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            value={opt.value}
            title={opt.label}
            icon={{ source: Icon.Circle, tintColor: COLOR_ICON_MAP[opt.value] }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="topicPrefixes"
        title="Topic Prefixes"
        placeholder="orders,payments,events (optional, comma-separated)"
        defaultValue={environment?.topicPrefixes ?? ""}
      />
    </Form>
  );
}

export default function ManageEnvironments() {
  const { data: environments = [], isLoading, revalidate } = useCachedPromise(getEnvironments);

  async function handleDelete(env: StoredEnvironment) {
    const confirmed = await confirmAlert({
      title: `Delete ${env.name}?`,
      message: `This will remove the "${env.name}" environment (${env.kafkaUiUrl} / ${env.clusterName}).`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteEnvironment(env.id);
      await showToast({
        style: Toast.Style.Success,
        title: `Deleted ${env.name}`,
      });
      revalidate();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search environments...">
      {environments.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="No Environments Configured"
          description="Add your first Kafka UI environment to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Environment"
                target={<EnvironmentForm onSave={revalidate} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Kafka UI Environments" subtitle={`${environments.length} configured`}>
          {environments.map((env) => (
            <List.Item
              key={env.id}
              icon={{ source: Icon.Circle, tintColor: resolveEnvColor(env) }}
              title={env.name}
              subtitle={env.clusterName}
              accessories={[
                { text: env.kafkaUiUrl },
                ...(env.topicPrefixes ? [{ tag: `prefixes: ${env.topicPrefixes}` }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit Environment"
                    target={<EnvironmentForm environment={env} onSave={revalidate} />}
                  />
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Environment"
                    target={<EnvironmentForm onSave={revalidate} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Environment"
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(env)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
