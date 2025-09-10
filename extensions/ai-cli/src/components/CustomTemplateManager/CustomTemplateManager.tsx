import { useCallback, useMemo, useState } from "react";
import { List, useNavigation } from "@raycast/api";
import { CustomTemplate, useCustomTemplates } from "@/hooks/useCustomTemplates";
import TemplateEditForm from "./components/TemplateEditForm";
import CreateEntityAction from "../shared/CreateEntityAction";
import { TemplateListItem } from "./components/TemplateListItem";
import { messages } from "@/locale/en/messages";
import {
  createTempTemplate,
  filterTemplates,
  getTemplatesCountMessage,
  handleTemplateDeletion,
} from "./CustomTemplateManager.helpers";
import { shouldShowEmptyView } from "@/utils/entity-list-helpers";

export default function CustomTemplateManager() {
  const { templates, isLoading, addTemplate, updateTemplate, deleteTemplate } = useCustomTemplates();
  const { push, pop } = useNavigation();
  const [searchText, setSearchText] = useState("");

  const filteredTemplates = useMemo(() => {
    return filterTemplates(templates, searchText);
  }, [templates, searchText]);

  const handleDelete = useCallback(
    async (template: CustomTemplate) => {
      await handleTemplateDeletion(template, deleteTemplate);
    },
    [deleteTemplate]
  );

  const handleEdit = useCallback(
    (template: CustomTemplate) => {
      push(
        <TemplateEditForm
          template={template}
          onCreate={addTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
          onSuccess={() => pop()}
        />
      );
    },
    [push, pop, addTemplate, updateTemplate, deleteTemplate]
  );

  const handleCreate = useCallback(() => {
    const tempTemplate = createTempTemplate();

    push(
      <TemplateEditForm
        template={tempTemplate}
        onCreate={addTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
        onSuccess={() => pop()}
      />
    );
  }, [push, pop, addTemplate, updateTemplate, deleteTemplate]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={messages.search.templatesPlaceholder}
      navigationTitle={messages.management.navigationTitle.customTemplates}
      actions={<CreateEntityAction title={messages.management.createNewTemplate} onAction={handleCreate} wrapInPanel />}
    >
      <List.Section title={getTemplatesCountMessage(filteredTemplates.length)}>
        {filteredTemplates.map((template) => (
          <TemplateListItem
            key={template.id}
            template={template}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={handleCreate}
          />
        ))}
      </List.Section>

      {shouldShowEmptyView(filteredTemplates, isLoading) && (
        <List.EmptyView
          title={messages.management.noTemplatesFound}
          description={messages.management.createFirstTemplate}
          actions={
            <CreateEntityAction title={messages.management.createNewTemplate} onAction={handleCreate} wrapInPanel />
          }
        />
      )}
    </List>
  );
}
