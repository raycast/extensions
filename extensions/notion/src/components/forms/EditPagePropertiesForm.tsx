import { ActionPanel, Clipboard, Icon, Form, showToast, Action, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { useVisibleDatabasePropIds, useRecentPages, useRelations, useUsers } from "../../hooks";
import {
  patchPage,
  DatabaseProperty,
  Page,
  WritablePageProperty,
  propertyValueToFormValue,
  formValueToPropertyValue,
  WritablePropertyTypes,
} from "../../utils/notion";
import { handleOnOpenPage } from "../../utils/openPage";
import { ActionSetVisibleProperties } from "../actions";
import { ActionSetOrderProperties } from "../actions";

import { createConvertToFieldFunc } from "./PagePropertyField";

export type CreatePageFormValues = {
  database: string | undefined;
  [K: string]: Form.Value | undefined;
};

interface EditPagePropertiesFormParams {
  page: Page;
  databaseProperties: DatabaseProperty[];
  mutate: () => Promise<void>;
}

export function EditPagePropertiesForm({
  page: { id, title, parent_database_id, properties },
  databaseProperties,
  mutate,
}: EditPagePropertiesFormParams) {
  const { visiblePropIds, setVisiblePropIds } = useVisibleDatabasePropIds(parent_database_id || "__no_id__");
  const { data: users } = useUsers();
  const { data: relationPages, isLoading: isLoadingRelationPages } = useRelations(databaseProperties);
  const { setRecentPage } = useRecentPages();

  const [isTitleEmpty, setIsTitleEmpty] = useState(false);
  const { pop } = useNavigation();

  const databasePropertyIds = databaseProperties.map((dp) => dp.id) || [];

  async function handleSubmit(values: Form.Values) {
    try {
      const updatedProperties: Parameters<typeof patchPage>[1] = {};
      for (const id in values) {
        const type = databaseProperties.find((prop) => prop.id == id)!.type as WritablePropertyTypes;
        const value = formValueToPropertyValue(type, values[id]);
        if (value) updatedProperties[id] = value;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating page" });
      const page = await patchPage(id, updatedProperties);
      await mutate();
      if (page) {
        pop();
        toast.style = Toast.Style.Success;
        toast.title = "Page updated";
        toast.primaryAction = {
          title: "Open Page",
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: () => handleOnOpenPage(page, setRecentPage),
        };
        if (page.url)
          toast.secondaryAction = {
            title: "Copy URL",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: () => {
              Clipboard.copy(page.url as string);
            },
          };
      }
    } catch (error) {
      console.error(error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to create page" });
    }
  }

  function filterProperties(dp: DatabaseProperty) {
    return dp.type != "title" && dp.type != "formula" && (!visiblePropIds || visiblePropIds.includes(dp.id));
  }

  function sortProperties(a: DatabaseProperty, b: DatabaseProperty) {
    if (!visiblePropIds) {
      if (a.type == "title") return -1;
      if (b.type == "title") return 1;
      return 0;
    }

    const valueA = visiblePropIds.indexOf(a.id);
    const valueB = visiblePropIds.indexOf(b.id);
    if (valueA > valueB) return 1;
    if (valueA < valueB) return -1;
    return 0;
  }

  function itemPropsFor<T extends DatabaseProperty["type"]>(dbProperty: DatabaseProperty) {
    const value = propertyValueToFormValue<T>(properties[dbProperty.name] as WritablePageProperty);
    return {
      title: dbProperty.name,
      key: dbProperty.id,
      id: dbProperty.id,
      defaultValue: value === null ? undefined : value,
    };
  }

  const convertToField = createConvertToFieldFunc(itemPropsFor, relationPages, users);

  return (
    <Form
      isLoading={isLoadingRelationPages}
      navigationTitle={"Update Page Properties"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Page Properties"
            icon={Icon.Plus}
            onSubmit={async (values: CreatePageFormValues) => {
              handleSubmit(values);
            }}
          />
          <ActionPanel.Section title="View options">
            <ActionSetVisibleProperties
              databaseProperties={databaseProperties.filter((dp) => dp.id !== "title")}
              selectedPropertiesIds={visiblePropIds || databasePropertyIds}
              onSelect={(propertyId) =>
                setVisiblePropIds(visiblePropIds ? [...visiblePropIds, propertyId] : [propertyId])
              }
              onUnselect={(propertyId) =>
                setVisiblePropIds((visiblePropIds || databasePropertyIds).filter((pid) => pid !== propertyId))
              }
            />
            <ActionSetOrderProperties
              databaseProperties={databaseProperties}
              propertiesOrder={visiblePropIds || databasePropertyIds}
              onChangeOrder={setVisiblePropIds}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        info="Supports a single line of inline Markdown"
        defaultValue={title ?? "Untitled"}
        title={"Title"}
        key={id}
        id="title"
        onBlur={(event) => setIsTitleEmpty(event.target.value == undefined || event.target.value == "")}
        error={isTitleEmpty ? "Title is required" : undefined}
      />
      {databaseProperties?.filter(filterProperties).sort(sortProperties).map(convertToField)}
    </Form>
  );
}
