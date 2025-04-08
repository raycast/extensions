import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { EmptyViewObject, ObjectActions, ObjectListItem, ViewType } from ".";
import { useSearch, useTemplates } from "../hooks";
import { Space, Template } from "../models";
import { pluralize, processObject } from "../utils";

type TemplatesListProps = {
  space: Space;
  typeId: string;
  isGlobalSearch: boolean;
  isPinned: boolean;
};

export function TemplateList({ space, typeId, isGlobalSearch, isPinned }: TemplatesListProps) {
  const [searchText, setSearchText] = useState("");
  const { templates, templatesError, isLoadingTemplates, mutateTemplates, templatesPagination } = useTemplates(
    space.id,
    typeId,
  );
  const { objects, objectsError, isLoadingObjects, mutateObjects, objectsPagination } = useSearch(
    space.id,
    searchText,
    [typeId],
  );

  useEffect(() => {
    if (templatesError) {
      showToast(Toast.Style.Failure, "Failed to fetch templates", templatesError.message);
    }
  }, [templatesError]);

  useEffect(() => {
    if (objectsError) {
      showToast(Toast.Style.Failure, "Failed to fetch objects", objectsError.message);
    }
  }, [objectsError]);

  const filteredTemplates = templates?.filter((template: Template) =>
    template.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const filteredObjects = objects
    ?.filter((object) => object.name.toLowerCase().includes(searchText.toLowerCase()))
    .map((object) => {
      return processObject(object, false, mutateObjects);
    });

  return (
    <List
      isLoading={isLoadingTemplates || isLoadingObjects}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search templates and objects..."
      navigationTitle={`Browse ${space.name}`}
      pagination={objectsPagination || templatesPagination}
      throttle={true}
    >
      {filteredTemplates && filteredTemplates.length > 0 && (
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
                  space={space}
                  objectId={template.id}
                  title={template.name}
                  mutateTemplates={mutateTemplates}
                  layout={"basic"} // TODO: refactor to use correct layout
                  viewType={ViewType.templates}
                  isGlobalSearch={isGlobalSearch}
                  isNoPinView={true}
                  isPinned={isPinned}
                />
              }
            />
          ))}
        </List.Section>
      )}

      {filteredObjects && filteredObjects.length > 0 && (
        <List.Section
          title={searchText ? "Search Results" : "Objects"}
          subtitle={`${pluralize(filteredObjects.length, "object", { withNumber: true })}`}
        >
          {filteredObjects.map((object) => (
            <ObjectListItem
              key={object.id}
              space={space}
              objectId={object.id}
              icon={object.icon}
              title={object.title}
              subtitle={object.subtitle}
              accessories={object.accessories}
              mutate={object.mutate}
              layout={object.layout}
              viewType={ViewType.objects}
              isGlobalSearch={isGlobalSearch}
              isNoPinView={true}
              isPinned={object.isPinned}
            />
          ))}
        </List.Section>
      )}

      {(!filteredTemplates || filteredTemplates.length === 0) && (!filteredObjects || filteredObjects.length === 0) && (
        <EmptyViewObject
          title="No templates or objects found"
          contextValues={{
            space: space.id,
            type: typeId,
            name: searchText,
          }}
        />
      )}
    </List>
  );
}
