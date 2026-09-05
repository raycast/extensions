import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { TemplateForm } from "./components/template-form";
import type { CardTemplate } from "./domain/template";
import { TemplateRepository } from "./storage/template-repository";

const repository = new TemplateRepository();
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function ManageTemplates() {
  const { data: templates = [], error, isLoading, revalidate } = usePromise(() => repository.list(), []);
  const refresh = async (): Promise<void> => {
    await revalidate();
  };

  async function duplicate(template: CardTemplate): Promise<void> {
    try {
      await repository.duplicate(template.id);
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: "Template duplicated" });
    } catch (duplicateError: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not duplicate template",
        message: errorMessage(duplicateError),
      });
    }
  }

  async function deleteTemplate(template: CardTemplate): Promise<void> {
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: `Delete "${template.name}"?`,
      message: "This template cannot be recovered.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }

    try {
      await repository.delete(template.id);
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: "Template deleted" });
    } catch (deleteError: unknown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete template",
        message: errorMessage(deleteError),
      });
    }
  }

  const createAction = (
    <Action.Push
      title="Create Template"
      icon={Icon.NewDocument}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<TemplateForm repository={repository} onSaved={refresh} onDeleted={refresh} />}
    />
  );

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search templates">
      {templates.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Document}
          title={error ? "Couldn't Load Templates" : "No Templates Yet"}
          description={error ? errorMessage(error) : "Create a Markdown template to make your first card."}
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      ) : (
        templates.map((template) => (
          <List.Item
            key={template.id}
            icon={Icon.Snippets}
            title={template.name}
            detail={<TemplateDetail template={template} />}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Template"
                  icon={Icon.Pencil}
                  target={
                    <TemplateForm repository={repository} template={template} onSaved={refresh} onDeleted={refresh} />
                  }
                />
                {createAction}
                <Action
                  title="Duplicate Template"
                  icon={Icon.Duplicate}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => duplicate(template)}
                />
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete Template"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteTemplate(template)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function TemplateDetail({ template }: { readonly template: CardTemplate }) {
  return (
    <List.Item.Detail
      markdown={templateMarkdown(template)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Deck" text={template.deckName} icon={Icon.Book} />
          <List.Item.Detail.Metadata.Label title="Mochi Template" text={outputLabel(template)} icon={Icon.Box} />
          {template.tags.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {template.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Reverse Review" text={template.reviewReverse ? "Enabled" : "Off"} />
          <List.Item.Detail.Metadata.Label title="Archived" text={template.archived ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Label title="Updated" text={dateFormatter.format(new Date(template.updatedAt))} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function templateMarkdown(template: CardTemplate): string {
  const fields = template.fields.map((field) => `- **${field.name}** \`${field.type}\``).join("\n");
  const mappings =
    template.output.kind === "mochi-template"
      ? mochiTemplateMappingsMarkdown(template.output.target, template.fields)
      : "";

  return ["### Input Fields", "", fields, mappings].filter(Boolean).join("\n");
}

function mochiTemplateMappingsMarkdown(
  target: Extract<CardTemplate["output"], { readonly kind: "mochi-template" }>["target"],
  fields: CardTemplate["fields"]
): string {
  if (target.status === "needs-configuration") {
    return "";
  }

  const sourceFields = new Map(fields.map((field) => [field.id, field.name]));
  const mappings = target.bindings.map((binding) => {
    const targetField = target.template.fields.find((field) => field.id === binding.targetFieldId);
    const source =
      binding.kind === "input"
        ? (sourceFields.get(binding.sourceFieldId) ?? binding.sourceFieldId)
        : "<Custom Mapping>";
    return `- **${targetField?.name ?? binding.targetFieldId}** ← ${source}`;
  });

  return ["", "### Mochi Field Mappings", "", mappings.length > 0 ? mappings.join("\n") : "No fields mapped."].join(
    "\n"
  );
}

function outputLabel(template: CardTemplate): string {
  if (template.output.kind === "card-body") {
    return template.output.templateMode === "deck-default" ? "Default Deck Template" : "No Template";
  }
  return template.output.target.status === "configured" ? template.output.target.template.name : "Needs Mapping";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
