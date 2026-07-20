import {
  ActionPanel,
  Action,
  Icon,
  List,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
  Toast,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { IssueTrackerConfig } from "./types";
import { useIssueTracker } from "./hooks/useIssueTracker";

export default function ConfigureUrlTrackers() {
  const { configs, deleteConfig } = useIssueTracker();

  return (
    <List
      navigationTitle="Configure URL Trackers"
      searchBarPlaceholder="Search rules by title..."
      actions={
        <ActionPanel>
          <AddNewRuleAction />
        </ActionPanel>
      }
    >
      {configs.length === 0 ? (
        <List.EmptyView
          title="No URL tracker rules configured"
          description="Add new URL trackers using the 'Add New Rule' action"
          icon={Icon.Link}
        />
      ) : (
        configs.map((config) => (
          <RuleListItem key={config.id} config={config} onDelete={() => deleteConfig(config.id)} />
        ))
      )}
    </List>
  );
}

function RuleListItem({ config, onDelete }: { config: IssueTrackerConfig; onDelete: () => void }) {
  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Rule",
      message: `Are you sure you want to delete rule "${config.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      onDelete();
    }
  };

  return (
    <List.Item
      title={config.title}
      accessories={[{ text: config.urlPlaceholder }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={config.title}>
            <Action.Push
              title="Edit Rule"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<UrlTrackerEditorForm initialConfig={config} />}
            />
            <Action
              title="Delete Rule"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDelete}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>

          <AddNewRuleAction />
        </ActionPanel>
      }
    />
  );
}

function AddNewRuleAction() {
  return (
    <Action.Push
      title="Add New Rule"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<UrlTrackerEditorForm />}
    />
  );
}

function UrlTrackerEditorForm({ initialConfig }: { initialConfig?: IssueTrackerConfig }) {
  const { pop } = useNavigation();
  const { addConfig, updateConfig, validateConfig } = useIssueTracker();

  const [title, setTitle] = useState(initialConfig?.title ?? "");
  const [regex, setRegex] = useState(initialConfig?.regex ?? "");
  const [urlPlaceholder, setUrlPlaceholder] = useState(initialConfig?.urlPlaceholder ?? "");

  const handleSubmit = (values: { title: string; regex: string; urlPlaceholder: string }) => {
    try {
      validateConfig(values);
    } catch (error) {
      showToast({
        title: "Invalid Regex",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
      return;
    }

    if (initialConfig) {
      updateConfig(initialConfig.id, values.title.trim(), values.regex.trim(), values.urlPlaceholder.trim());
    } else {
      addConfig(values.title.trim(), values.regex.trim(), values.urlPlaceholder.trim());
    }
    pop();
  };

  return (
    <Form
      navigationTitle={initialConfig ? "Edit Rule" : "Add Rule"}
      searchBarAccessory={<Form.LinkAccessory text="Regex Playground" target="https://regex101.com/" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialConfig ? "Save Changes" : "Create Rule"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g., Jira Issue, GitHub Issue"
        value={title}
        error={title.trim().length === 0 ? "Required" : undefined}
        onChange={setTitle}
      />
      <Form.TextField
        id="regex"
        title="Regex Pattern"
        placeholder="PROJECT-(\d+)"
        value={regex}
        info="It should include a capture group for the issue number"
        error={regex.trim().length === 0 ? "Required" : undefined}
        onChange={setRegex}
      />
      <Form.TextField
        id="urlPlaceholder"
        title="URL Template"
        placeholder="https://your-comp.atlassian.net/browse/PROJECT-@key"
        info="Use @key placeholder where the regex match should be inserted"
        value={urlPlaceholder}
        error={urlPlaceholder.trim().length === 0 ? "Required" : undefined}
        onChange={setUrlPlaceholder}
      />
    </Form>
  );
}
