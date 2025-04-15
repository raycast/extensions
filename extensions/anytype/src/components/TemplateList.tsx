import { useState } from "react";
import { List, showToast, Toast } from "@raycast/api";
import { useTemplates } from "../hooks/useTemplates";
import { Template } from "../helpers/schemas";
import { pluralize } from "../helpers/strings";
import ObjectActions from "./ObjectActions";
import EmptyView from "./EmptyView";

type TemplatesListProps = {
  spaceId: string;
  typeId: string;
};

export default function TemplateList({ spaceId, typeId }: TemplatesListProps) {
  const [searchText, setSearchText] = useState("");
  const { templates, templatesError, isLoadingTemplates, mutateTemplates, templatesPagination } = useTemplates(
    spaceId,
    typeId,
  );

  if (templatesError) {
    showToast(Toast.Style.Failure, "Failed to fetch templates", templatesError.message);
  }

  const filteredTemplates = templates?.filter((template: Template) =>
    template.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoadingTemplates}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Templates..."
      pagination={templatesPagination}
    >
      {filteredTemplates && filteredTemplates.length > 0 ? (
        <List.Section
          title={searchText ? "Search Results" : "Templates"}
          subtitle={`${pluralize(filteredTemplates.length, "template", { withNumber: true })}`}
        >
          {filteredTemplates.map((template: Template) => (
            <List.Item
              key={template.id}
              title={template.name}
              icon={template.icon}
              actions={
                <ObjectActions
                  spaceId={spaceId}
                  objectId={template.id}
                  title={template.name}
                  mutateTemplates={mutateTemplates}
                  viewType="template"
                />
              }
            />
          ))}
        </List.Section>
      ) : (
        <EmptyView title="No templates found" />
      )}
    </List>
  );
}
