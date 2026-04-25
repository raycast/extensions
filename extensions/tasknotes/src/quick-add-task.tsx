import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { parseNaturalLanguageTask } from "./natural-language";
import {
  createTaskNote,
  isMultipleVaultMode,
  listVaults,
  naturalLanguageDateTarget,
  obsidianUrl,
  sortVaultsForDefault,
} from "./tasknotes";

type FormValues = {
  text: string;
  vaultName: string;
  openInObsidian: boolean;
};

export default function Command() {
  const multipleVaults = isMultipleVaultMode();
  const { data: vaults = [], isLoading } = useCachedPromise(listVaults);
  const orderedVaults = sortVaultsForDefault(vaults);

  async function submit(values: FormValues) {
    const text = values.text.trim();
    if (!text) {
      await showToast({ style: Toast.Style.Failure, title: "Task text is required" });
      return;
    }

    try {
      const vaultName = multipleVaults ? values.vaultName : undefined;
      const defaultDateTarget = await naturalLanguageDateTarget(vaultName);
      const task = await createTaskNote({
        ...parseNaturalLanguageTask(text, new Date(), { defaultDateTarget }),
        vaultName,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Obsidian",
          onAction: () => open(obsidianUrl(task)),
        },
      });

      if (values.openInObsidian) {
        await open(obsidianUrl(task));
      }

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
      <Form.TextField id="text" title="Task" placeholder="Follow up tomorrow #work @calls high priority" autoFocus />
      {multipleVaults ? (
        <Form.Dropdown id="vaultName" title="Vault" defaultValue={orderedVaults[0]?.name}>
          {orderedVaults.map((vault) => (
            <Form.Dropdown.Item key={vault.path} value={vault.name} title={vault.name} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.Checkbox id="openInObsidian" title="Open" label="Open task in Obsidian after creation" />
    </Form>
  );
}
