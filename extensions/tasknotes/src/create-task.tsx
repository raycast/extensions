import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  createTaskNote,
  defaultVaultName,
  isMultipleVaultMode,
  listVaults,
  obsidianUrl,
  preferences,
  sortVaultsForDefault,
  type NewTaskValues,
} from "./tasknotes";

type FormValues = {
  vaultName: string;
  title: string;
  details: string;
  status: string;
  priority: string;
  due: Date | null;
  scheduled: Date | null;
  contexts: string;
  projects: string;
  tags: string;
};

export default function Command() {
  const prefs = preferences();
  const multipleVaults = isMultipleVaultMode();
  const { data, isLoading } = useCachedPromise(async () => ({
    vaults: await listVaults(),
    defaultVaultName: await defaultVaultName(),
  }));
  const orderedVaults = sortVaultsForDefault(data?.vaults ?? [], data?.defaultVaultName);

  async function submit(values: FormValues) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    try {
      const task = await createTaskNote(values as NewTaskValues);
      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Obsidian",
          onAction: () => open(obsidianUrl(task)),
        },
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {multipleVaults ? (
        <Form.Dropdown
          key={orderedVaults[0]?.name}
          id="vaultName"
          title="Vault"
          defaultValue={orderedVaults[0]?.name}
          autoFocus
        >
          {orderedVaults.map((vault) => (
            <Form.Dropdown.Item key={vault.path} value={vault.name} title={vault.name} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField id="title" title="Title" placeholder="Write task title" autoFocus={!multipleVaults} />
      <Form.TextArea id="details" title="Details" placeholder="Optional Markdown notes" />
      <Form.Dropdown id="status" title="Status" defaultValue="">
        <Form.Dropdown.Item value="" title="TaskNotes Default" />
        <Form.Dropdown.Item value={prefs.openStatus} title={capitalize(prefs.openStatus)} />
        <Form.Dropdown.Item value="in-progress" title="In Progress" />
        <Form.Dropdown.Item value={prefs.doneStatus} title={capitalize(prefs.doneStatus)} />
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="">
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="normal" title="Normal" />
        <Form.Dropdown.Item value="highest" title="Highest" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="lowest" title="Lowest" />
      </Form.Dropdown>
      <Form.DatePicker id="due" title="Due" />
      <Form.DatePicker id="scheduled" title="Scheduled" />
      <Form.TextField id="contexts" title="Contexts" placeholder="work, home, errands" />
      <Form.TextField id="projects" title="Projects" placeholder="website, client launch" />
      <Form.TextField id="tags" title="Tags" placeholder="work, urgent, #project" />
    </Form>
  );
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
