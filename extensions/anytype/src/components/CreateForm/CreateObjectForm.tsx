import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { formatRFC3339 } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { addObjectsToList, createObject } from "../../api";
import { useCreateObjectData, useTagsMap } from "../../hooks";
import {
  AddObjectsToListRequest,
  CreateObjectRequest,
  IconFormat,
  ObjectLayout,
  PropertyFieldValue,
  PropertyFormat,
  PropertyLinkWithValue,
} from "../../models";
import {
  bundledPropKeys,
  defaultTintColor,
  fetchTypeKeysForLists,
  getNumberFieldValidations,
  isEmoji,
} from "../../utils";

export interface CreateObjectFormValues {
  spaceId?: string;
  typeId?: string;
  templateId?: string;
  listId?: string;
  name?: string;
  icon?: string;
  description?: string;
  body?: string;
  source?: string;

  /**
   * Dynamic property values coming from the selected Type definition.
   * Keys are the property `key` strings and values depend on the property format:
   * - "text" & "select"  -> string
   * - "number"           -> string (raw text input before cast)
   * - "date"             -> Date | null (Raycast DatePicker returns a Date object)
   * - "multi_select"     -> string[]
   * - "checkbox"         -> boolean
   */
  [key: string]: PropertyFieldValue;
}

interface CreateObjectFormProps {
  draftValues: CreateObjectFormValues;
  enableDrafts: boolean;
}

export function CreateObjectForm({ draftValues, enableDrafts }: CreateObjectFormProps) {
  const {
    spaces,
    types,
    templates,
    lists,
    objects,
    selectedSpaceId,
    setSelectedSpaceId,
    selectedTypeId,
    setSelectedTypeId,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedListId,
    setSelectedListId,
    listSearchText,
    setListSearchText,
    objectSearchText,
    setObjectSearchText,
    isLoadingData,
  } = useCreateObjectData(draftValues);

  const [isLoading, setIsLoading] = useState(false);
  const [typeKeysForLists, setTypeKeysForLists] = useState<string[]>([]);

  const selectedTypeDef = types.find((type) => type.id === selectedTypeId);
  const selectedTypeKey = selectedTypeDef?.key ?? "";
  const hasSelectedSpaceIdAndType = Boolean(selectedSpaceId && selectedTypeKey);

  const properties = selectedTypeDef?.properties?.filter((p) => !Object.values(bundledPropKeys).includes(p.key)) || [];
  const { tagsMap } = useTagsMap(
    selectedSpaceId,
    properties
      .filter((prop) => prop.format === PropertyFormat.Select || prop.format === PropertyFormat.MultiSelect)
      .map((prop) => prop.id),
  );

  const numberFieldValidations = useMemo(() => getNumberFieldValidations(properties), [properties]);

  useEffect(() => {
    const fetchTypesForLists = async () => {
      if (spaces) {
        const listsTypes = await fetchTypeKeysForLists(spaces);
        setTypeKeysForLists(listsTypes);
      }
    };
    fetchTypesForLists();
  }, [spaces]);

  const { handleSubmit, itemProps } = useForm<CreateObjectFormValues>({
    initialValues: draftValues,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating object..." });
        const propertiesEntries: PropertyLinkWithValue[] = [];
        properties.forEach((prop) => {
          const raw = itemProps[prop.key]?.value;
          if (raw !== undefined && raw !== null && raw !== "" && raw !== false) {
            const entry: PropertyLinkWithValue = { key: prop.key };
            switch (prop.format) {
              case PropertyFormat.Text:
                entry.text = String(raw);
                break;
              case PropertyFormat.Select:
                entry.select = String(raw);
                break;
              case PropertyFormat.Url:
                entry.url = String(raw);
                break;
              case PropertyFormat.Email:
                entry.email = String(raw);
                break;
              case PropertyFormat.Phone:
                entry.phone = String(raw);
                break;
              case PropertyFormat.Number:
                entry.number = Number(raw);
                break;
              case PropertyFormat.MultiSelect:
                entry.multi_select = raw as string[];
                break;
              case PropertyFormat.Date:
                {
                  const date = raw instanceof Date ? raw : new Date(String(raw));
                  if (!isNaN(date.getTime())) {
                    entry.date = formatRFC3339(date);
                  } else {
                    console.warn(`Invalid date value for property ${prop.key}:`, raw);
                  }
                }
                break;
              case PropertyFormat.Checkbox:
                entry.checkbox = Boolean(raw);
                break;
              case PropertyFormat.Files:
                entry.files = Array.isArray(raw) ? (raw as string[]) : [String(raw)];
                break;
              case PropertyFormat.Objects:
                entry.objects = Array.isArray(raw) ? (raw as string[]) : [String(raw)];
                break;
              default:
                console.warn(`Unsupported property format: ${prop.format}`);
                break;
            }
            propertiesEntries.push(entry);
          }
        });

        const descriptionValue = itemProps[bundledPropKeys.description]?.value;
        if (descriptionValue !== undefined && descriptionValue !== null && descriptionValue !== "") {
          propertiesEntries.push({
            key: bundledPropKeys.description,
            text: String(descriptionValue),
          });
        }

        const sourceValue = itemProps[bundledPropKeys.source]?.value;
        if (sourceValue !== undefined && sourceValue !== null && sourceValue !== "") {
          propertiesEntries.push({
            key: bundledPropKeys.source,
            url: String(sourceValue),
          });
        }

        const request: CreateObjectRequest = {
          name: values.name || "",
          icon: { format: IconFormat.Emoji, emoji: values.icon || "" },
          body: values.body || "",
          template_id: values.templateId || "",
          type_key: selectedTypeKey,
          properties: propertiesEntries,
        };

        const response = await createObject(selectedSpaceId, request);

        if (response.object.id) {
          if (selectedListId) {
            const request: AddObjectsToListRequest = { objects: [response.object.id] };
            await addObjectsToList(selectedSpaceId, selectedListId, request);
            await showToast(Toast.Style.Success, "Object created and added to collection");
          } else {
            await showToast(Toast.Style.Success, "Object created successfully");
          }
          popToRoot();
        } else {
          await showToast(Toast.Style.Failure, "Failed to create object");
        }
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create object" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: (v: PropertyFieldValue) => {
        const s = typeof v === "string" ? v.trim() : undefined;
        if (selectedTypeDef?.layout !== ObjectLayout.Note && selectedTypeDef?.layout !== ObjectLayout.Bookmark && !s) {
          return "Name is required";
        }
      },
      icon: (v: PropertyFieldValue) => {
        if (typeof v === "string" && v && !isEmoji(v)) {
          return "Icon must be single emoji";
        }
      },
      source: (v: PropertyFieldValue) => {
        const s = typeof v === "string" ? v.trim() : undefined;
        if (selectedTypeDef?.layout === ObjectLayout.Bookmark && !s) {
          return "Source is required for Bookmarks";
        }
      },
      ...numberFieldValidations,
    },
  });

  function getQuicklink(): { name: string; link: string } {
    const url = "raycast://extensions/any/anytype/create-object";

    const defaults: Record<string, PropertyFieldValue> = {
      [itemProps.spaceId.id]: selectedSpaceId,
      [itemProps.typeId.id]: selectedTypeId,
      [itemProps.templateId.id]: selectedTemplateId,
      [itemProps.listId.id]: selectedListId,
      [itemProps.name.id]: itemProps.name.value,
      [itemProps.icon.id]: itemProps.icon.value,
      [itemProps.description.id]: itemProps.description.value,
      [itemProps.body.id]: itemProps.body.value,
      [itemProps.source.id]: itemProps.source.value,
    };

    properties.forEach((prop) => {
      const raw = itemProps[prop.key]?.value;
      if (raw !== undefined && raw !== null && raw !== "" && raw !== false) {
        defaults[prop.key] = raw;
      }
    });

    const launchContext = { defaults };

    return {
      name: `Create ${types.find((type) => type.id === selectedTypeId)?.name} in ${spaces.find((space) => space.id === selectedSpaceId)?.name}`,
      link: url + "?launchContext=" + encodeURIComponent(JSON.stringify(launchContext)),
    };
  }

  const textFieldPlaceholderMap: Partial<Record<PropertyFormat, string>> = {
    [PropertyFormat.Text]: "Add text",
    [PropertyFormat.Url]: "Add URL",
    [PropertyFormat.Email]: "Add email address",
    [PropertyFormat.Phone]: "Add phone number",
  };

  return (
    <Form
      navigationTitle="Create Object"
      isLoading={isLoading || isLoadingData}
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Object" icon={Icon.Plus} onSubmit={handleSubmit} />
          {hasSelectedSpaceIdAndType && (
            <Action.CreateQuicklink
              title={`Create Quicklink: ${types.find((type) => type.id === selectedTypeId)?.name}`}
              quicklink={getQuicklink()}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="spaceId"
        title="Channel"
        value={selectedSpaceId}
        onChange={(v) => {
          setSelectedSpaceId(v);
          setSelectedTypeId("");
          setSelectedTemplateId("");
          setSelectedListId("");
          setListSearchText("");
          setObjectSearchText("");
        }}
        storeValue={true}
        placeholder="Search channels..."
        info="Select the channel where the object will be created"
      >
        {spaces.map((space) => (
          <Form.Dropdown.Item key={space.id} value={space.id} title={space.name} icon={space.icon} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="typeId"
        title="Type"
        value={selectedTypeId}
        onChange={setSelectedTypeId}
        storeValue={true} // TODO: storeValue does not work here
        placeholder={`Search types in '${spaces.find((space) => space.id === selectedSpaceId)?.name}'...`}
        info="Select the type of object to create"
      >
        {types.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} icon={type.icon} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="templateId"
        title="Template"
        value={selectedTemplateId}
        onChange={setSelectedTemplateId}
        storeValue={true}
        placeholder={`Search templates for '${types.find((type) => type.id === selectedTypeId)?.name}'...`}
        info="Select the template to use for the object"
      >
        <Form.Dropdown.Item
          key="none"
          value=""
          title="No Template"
          icon={{ source: "icons/type/copy.svg", tintColor: defaultTintColor }}
        />
        {templates.map((template) => (
          <Form.Dropdown.Item key={template.id} value={template.id} title={template.name} icon={template.icon} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="listId"
        title="Collection"
        value={selectedListId}
        onChange={setSelectedListId}
        onSearchTextChange={setListSearchText}
        throttle={true}
        storeValue={true}
        placeholder={`Search collections in '${spaces.find((space) => space.id === selectedSpaceId)?.name}'...`}
        info="Select the collection where the object will be added"
      >
        {!listSearchText && (
          <Form.Dropdown.Item
            key="none"
            value=""
            title="No Collection"
            icon={{ source: "icons/type/layers.svg", tintColor: defaultTintColor }}
          />
        )}
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} icon={list.icon} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {hasSelectedSpaceIdAndType && (
        <>
          {selectedTypeDef?.layout !== ObjectLayout.Note && selectedTypeDef?.layout !== ObjectLayout.Bookmark && (
            <Form.TextField
              {...itemProps.name}
              title="Name"
              placeholder="Add name"
              info="Enter the name of the object"
            />
          )}
          {selectedTypeDef?.layout !== ObjectLayout.Bookmark &&
            selectedTypeDef?.layout !== ObjectLayout.Note &&
            selectedTypeDef?.layout !== ObjectLayout.Action &&
            selectedTypeDef?.layout !== ObjectLayout.Profile && (
              <Form.TextField
                {...itemProps.icon}
                title="Icon"
                placeholder="Add emoji"
                info="Enter a single emoji character to represent the object"
              />
            )}
          {selectedTypeDef?.layout !== ObjectLayout.Bookmark ? (
            <>
              <Form.TextField
                {...itemProps.description}
                title="Description"
                placeholder="Add description"
                info="Provide a brief description of the object"
              />
              {!typeKeysForLists.includes(selectedTypeKey) && (
                <Form.TextArea
                  {...itemProps.body}
                  title="Body"
                  placeholder="Add text in markdown"
                  info="Parses markdown to Anytype Blocks.

It supports:
- Headings, subheadings, and paragraphs
- Number, bullet, and checkbox lists
- Code blocks, blockquotes, and tables
- Text formatting: bold, italics, strikethrough, inline code, hyperlinks"
                />
              )}
            </>
          ) : (
            <Form.TextField
              {...itemProps.source}
              title="Source"
              placeholder="Add source URL"
              info="Enter the URL of the source for bookmarks"
            />
          )}
          <Form.Separator />

          {properties.map((property) => {
            const tags = (tagsMap && tagsMap[property.id]) ?? [];
            const title = property.name;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { value, defaultValue, ...restItemProps } = itemProps[property.key];

            switch (property.format) {
              case PropertyFormat.Text:
              case PropertyFormat.Url:
              case PropertyFormat.Email:
              case PropertyFormat.Phone:
                return (
                  <Form.TextField
                    key={property.id}
                    {...restItemProps}
                    title={title}
                    placeholder={textFieldPlaceholderMap[property.format]}
                    value={String(value ?? "")}
                  />
                );
              case PropertyFormat.Number:
                return (
                  <Form.TextField
                    key={property.id}
                    {...restItemProps}
                    title={title}
                    placeholder="Add number"
                    value={String(value ?? "")}
                  />
                );
              case PropertyFormat.Select:
                return (
                  <Form.Dropdown
                    key={property.id}
                    {...restItemProps}
                    title={title}
                    value={String(value ?? "")}
                    placeholder={`Select tags for '${title}'...`}
                  >
                    <Form.Dropdown.Item
                      key="none"
                      value=""
                      title="No Tag"
                      icon={{ source: "icons/type/pricetag.svg", tintColor: defaultTintColor }}
                    />
                    {tags.map((tag) => (
                      <Form.Dropdown.Item
                        key={tag.id}
                        value={tag.id}
                        title={tag.name}
                        icon={{ source: "icons/type/pricetag.svg", tintColor: tag.color }}
                      />
                    ))}
                  </Form.Dropdown>
                );
              case PropertyFormat.MultiSelect:
                return (
                  <Form.TagPicker
                    {...restItemProps}
                    key={property.id}
                    title={title}
                    value={Array.isArray(value) ? (value as string[]) : []}
                    placeholder="Add tags"
                  >
                    {tags.map((tag) => (
                      <Form.TagPicker.Item
                        key={tag.id}
                        value={tag.id}
                        title={tag.name}
                        icon={{ source: "icons/type/pricetag.svg", tintColor: tag.color }}
                      />
                    ))}
                  </Form.TagPicker>
                );
              case PropertyFormat.Date:
                return (
                  <Form.DatePicker
                    {...restItemProps}
                    key={property.id}
                    title={title}
                    defaultValue={value as Date | undefined}
                  />
                );
              case PropertyFormat.Files:
                // TODO: implement
                return null;
              case PropertyFormat.Checkbox:
                return (
                  <Form.Checkbox key={property.id} {...restItemProps} title={title} label="" value={Boolean(value)} />
                );
              case PropertyFormat.Objects:
                return (
                  // TODO: TagPicker would be the more appropriate component, but it does not support onSearchTextChange
                  <Form.Dropdown
                    {...restItemProps}
                    key={property.id}
                    title={title}
                    value={String(value ?? "")}
                    onSearchTextChange={setObjectSearchText}
                    throttle={true}
                    placeholder={`Search objects in '${spaces.find((space) => space.id === selectedSpaceId)?.name}'...`}
                  >
                    {!objectSearchText && (
                      <Form.Dropdown.Item
                        key="none"
                        value=""
                        title="No Object"
                        icon={{ source: "icons/type/document.svg", tintColor: defaultTintColor }}
                      />
                    )}
                    {objects.map((object) => (
                      <Form.Dropdown.Item key={object.id} value={object.id} title={object.name} icon={object.icon} />
                    ))}
                  </Form.Dropdown>
                );
              default:
                console.warn(`Unsupported property format: ${property.format}`);
                return null;
            }
          })}
        </>
      )}
    </Form>
  );
}
