import { CustomTemplate } from "@/hooks/useCustomTemplates";
import { getFullPromptContent, getTemplateIcon, getTemplateSubtitle } from "../CustomTemplateManager.helpers";
import EntityListItem from "@/components/shared/EntityListItem";

interface TemplateListItemProps {
  template: CustomTemplate;
  onEdit: (template: CustomTemplate) => void;
  onDelete: (template: CustomTemplate) => void;
  onCreate: () => void;
}

export function TemplateListItem({ template, onEdit, onDelete, onCreate }: TemplateListItemProps) {
  return (
    <EntityListItem
      entity={template}
      subtitle={getTemplateSubtitle(template)}
      icon={getTemplateIcon(template)}
      onEdit={onEdit}
      onDelete={onDelete}
      onCreate={onCreate}
      copyContent={getFullPromptContent(template)}
      entityType="template"
    />
  );
}
