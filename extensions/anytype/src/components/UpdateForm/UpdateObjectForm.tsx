import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { formatRFC3339 } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { updateObject } from "../../api";
import { useMembers, useSearch, useSpaces, useTagsMap, useTypes } from "../../hooks";
import {
  IconFormat,
  ObjectIcon,
  ObjectLayout,
  PropertyFieldValue,
  PropertyFormat,
  PropertyLinkWithValue,
  RawSpaceObjectWithBody,
  SpaceObject,
  SpaceObjectWithBody,
  UpdateObjectRequest,
} from "../../models";
import {
  bundledPropKeys,
  defaultTintColor,
  fetchTypeKeysForLists,
  getNumberFieldValidations,
  isEmoji,
  memberMatchesSearch,
} from "../../utils";

interface UpdateObjectFormValues {
  name?: string;
  icon?: string;
  description?: string;
  typeKey?: string;
  [key: string]: PropertyFieldValue;
  markdown?: string;
}

interface UpdateObjectFormProps {
  spaceId: string;
  object: RawSpaceObjectWithBody;
  mutateObjects: MutatePromise<SpaceObject[]>[];
  mutateObject?: MutatePromise<SpaceObjectWithBody | undefined>;
}

export function UpdateObjectForm({ spaceId, object, mutateObjects, mutateObject }: UpdateObjectFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [objectSearchText, setObjectSearchText] = useState("");
  const [typeKeysForLists, setTypeKeysForLists] = useState<string[]>([]);
  const [selectedTypeKey, setSelectedTypeKey] = useState(object.type?.key ?? "");

  const { objects, objectsError, isLoadingObjects } = useSearch(spaceId, objectSearchText, []);
  const { members, membersError, isLoadingMembers } = useMembers(spaceId, objectSearchText);
  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const { types, typesError, isLoadingTypes } = useTypes(spaceId);

  const selectedType = types.find((t) => t.key === selectedTypeKey);
  const properties = selectedType?.properties.filter((p) => !Object.values(bundledPropKeys).includes(p.key)) ?? [];
  const numberFieldValidations = useMemo(() => getNumberFieldValidations(properties), [properties]);
  const { tagsMap, tagsError, isLoadingTags } = useTagsMap(
    spaceId,
    properties
      .filter((prop) => prop.format === PropertyFormat.Select || prop.format === PropertyFormat.MultiSelect)
      .map((prop) => prop.id),
  );

  const filteredMembers = useMemo(() => {
    return members.filter((member) => memberMatchesSearch(member, objectSearchText));
  }, [members, objectSearchText]);

  const combinedObjects = useMemo(() => {
    return [...(objects || []), ...filteredMembers];
  }, [objects, filteredMembers]);

  useEffect(() => {
    if (objectsError || tagsError || membersError || spacesError || typesError) {
      showFailureToast(objectsError || tagsError || membersError || spacesError || typesError, {
        title: "Failed to load data",
      });
    }
  }, [objectsError, tagsError, membersError, spacesError, typesError]);

  useEffect(() => {
    const fetchTypesForLists = async () => {
      if (spaces) {
        const listsTypes = await fetchTypeKeysForLists(spaces);
        setTypeKeysForLists(listsTypes);
      }
    };
    fetchTypesForLists();
  }, [spaces]);

  // Map existing property entries to form field values
  const initialPropertyValues: Record<string, PropertyFieldValue> = properties.reduce(
    (acc, prop) => {
      const entry = object.properties.find((p) => p.key === prop.key);
      if (entry) {
        let v: PropertyFieldValue;
        switch (prop.format) {
          case PropertyFormat.Text:
            v = entry.text ?? "";
            break;
          case PropertyFormat.Select:
            v = entry.select?.id ?? "";
            break;
          case PropertyFormat.Url:
            v = entry.url ?? "";
            break;
          case PropertyFormat.Email:
            v = entry.email ?? "";
            break;
          case PropertyFormat.Phone:
            v = entry.phone ?? "";
            break;
          case PropertyFormat.Number:
            v = entry.number ?? "";
            break;
          case PropertyFormat.MultiSelect:
            v = entry.multi_select?.map((tag) => tag.id) ?? [];
            break;
          case PropertyFormat.Date:
            v = entry.date ? new Date(entry.date) : undefined;
            break;
          case PropertyFormat.Checkbox:
            v = entry.checkbox ?? false;
            break;
          case PropertyFormat.Files:
            v = entry.files ?? [];
            break;
          case PropertyFormat.Objects:
            v = entry.objects ?? [];
            break;
          default:
            v = undefined;
        }
        acc[prop.key] = v;
      }
      return acc;
    },
    {} as Record<string, PropertyFieldValue>,
  );

  const descriptionEntry = object.properties.find((p) => p.key === bundledPropKeys.description);
  const initialIconValue = object.icon?.format === IconFormat.Emoji ? (object.icon.emoji ?? "") : "";

  const initialValues: UpdateObjectFormValues = {
    name: object.name,
    icon: initialIconValue,
    description: descriptionEntry?.text ?? "",
    typeKey: object.type?.key ?? "",
    markdown: object.markdown,
    ...initialPropertyValues,
  };

  const { handleSubmit, itemProps } = useForm<UpdateObjectFormValues>({
    initialValues: initialValues,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        await showToast({ style: Toast.Style.Animated, title: "Updating object…" });

        const propertiesEntries: PropertyLinkWithValue[] = [];
        properties.forEach((prop) => {
          const raw = itemProps[prop.key]?.value;
          const entry: PropertyLinkWithValue = { key: prop.key };
          switch (prop.format) {
            case PropertyFormat.Text:
              entry.text = String(raw);
              break;
            case PropertyFormat.Select:
              entry.select = raw != null && raw !== "" ? String(raw) : null;
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
              entry.number = raw != null && raw !== "" ? Number(raw) : null;
              break;
            case PropertyFormat.MultiSelect:
              entry.multi_select = Array.isArray(raw) ? (raw as string[]) : [];
              break;
            case PropertyFormat.Date:
              if (raw instanceof Date) {
                entry.date = formatRFC3339(raw);
              } else {
                entry.date = null;
              }
              break;
            case PropertyFormat.Checkbox:
              entry.checkbox = Boolean(raw);
              break;
            case PropertyFormat.Files:
              entry.files = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];
              break;
            case PropertyFormat.Objects:
              entry.objects = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];
              break;
            default:
              console.warn(`Unsupported property format: ${prop.format}`);
              break;
          }
          propertiesEntries.push(entry);
        });

        const descriptionRaw = itemProps[bundledPropKeys.description]?.value;
        if (descriptionRaw !== undefined && descriptionRaw !== null) {
          propertiesEntries.push({
            key: bundledPropKeys.description,
            text: String(descriptionRaw),
          });
        }

        const iconField = values.icon as string;
        const iconPayload: ObjectIcon | undefined =
          iconField !== initialIconValue ? { format: IconFormat.Emoji, emoji: iconField } : undefined;

        const payload: UpdateObjectRequest = {
          name: values.name,
          ...(iconPayload && { icon: iconPayload }),
          ...(values.typeKey && values.typeKey !== object.type?.key && { type_key: values.typeKey }),
          properties: propertiesEntries,
          markdown: values.markdown,
        };

        await updateObject(spaceId, object.id, payload);

        await showToast(Toast.Style.Success, "Object updated");
        await Promise.all(mutateObjects.map((mutate) => mutate()));
        if (mutateObject) {
          mutateObject();
        }
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update object" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: (v: PropertyFieldValue) => {
        const s = typeof v === "string" ? v.trim() : "";
        if (object.layout !== ObjectLayout.Note && object.layout !== ObjectLayout.Bookmark && !s) {
          return "Name is required";
        }
      },
      icon: (v: PropertyFieldValue) => {
        if (typeof v === "string" && v && !isEmoji(v)) {
          return "Icon must be a single emoji";
        }
      },
      ...numberFieldValidations,
    },
  });

  return (
    <Form
      navigationTitle={`Edit ${object.type?.name ?? "Object"}`}
      isLoading={
        isLoading || isLoadingObjects || isLoadingTags || isLoadingMembers || isLoadingTypes || isLoadingSpaces
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.typeKey}
        title="Type"
        value={selectedTypeKey}
        onChange={(newTypeKey) => {
          setSelectedTypeKey(newTypeKey);
          itemProps.typeKey.onChange?.(newTypeKey);
        }}
        info="Change the type of the object"
      >
        {types.map((type) => (
          <Form.Dropdown.Item key={type.id} value={type.key} title={type.name} icon={type.icon} />
        ))}
      </Form.Dropdown>

      {object.layout !== ObjectLayout.Note && (
        <Form.TextField {...itemProps.name} title="Name" placeholder="Add name" info="Enter the name of the object" />
      )}
      {object.layout !== ObjectLayout.Note &&
        object.layout !== ObjectLayout.Bookmark &&
        object.layout !== ObjectLayout.Action &&
        object.layout !== ObjectLayout.Profile && (
          <Form.TextField
            {...itemProps.icon}
            title="Icon"
            placeholder="Add emoji"
            info={
              object.icon?.format === IconFormat.File
                ? "Current icon is a file. Enter an emoji to replace it."
                : object.icon?.format === IconFormat.Icon
                  ? "Current icon is a built-in icon. Enter an emoji to replace it."
                  : "Add an emoji to change the icon"
            }
          />
        )}
      <Form.TextField
        {...itemProps.description}
        title="Description"
        placeholder="Add description"
        info="Provide a brief description of the object"
      />

      {!typeKeysForLists.includes(selectedTypeKey) && (
        <Form.TextArea
          {...itemProps.markdown}
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

      <Form.Separator />

      {properties.map((property) => {
        const tags = (tagsMap && tagsMap[property.id]) ?? [];

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
                title={property.name}
                placeholder="Add text"
                value={String(value ?? "")}
              />
            );
          case PropertyFormat.Number:
            return (
              <Form.TextField
                key={property.id}
                {...restItemProps}
                title={property.name}
                placeholder="Add number"
                value={String(value ?? "")}
              />
            );
          case PropertyFormat.Select:
            return (
              <Form.Dropdown
                key={property.id}
                {...restItemProps}
                title={property.name}
                value={String(value ?? "")}
                placeholder={`Select tags for ${property.name}`}
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
                key={property.id}
                {...restItemProps}
                title={property.name}
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
                key={property.id}
                {...restItemProps}
                title={property.name}
                defaultValue={value as Date | undefined}
              />
            );
          case PropertyFormat.Files:
            // TODO: implement file picker
            return null;
          case PropertyFormat.Checkbox:
            return (
              <Form.Checkbox
                key={property.id}
                {...restItemProps}
                label=""
                title={property.name}
                value={Boolean(value)}
              />
            );
          case PropertyFormat.Objects:
            return (
              <Form.Dropdown
                key={property.id}
                {...restItemProps}
                title={property.name}
                value={String(value ?? "")}
                onSearchTextChange={setObjectSearchText}
                throttle={true}
                placeholder="Select object"
              >
                {!objectSearchText && (
                  <Form.Dropdown.Item
                    key="none"
                    value=""
                    title="No Object"
                    icon={{ source: "icons/type/document.svg", tintColor: defaultTintColor }}
                  />
                )}
                {combinedObjects
                  .filter((candidate) => candidate.id !== object.id)
                  .map((object) => (
                    <Form.Dropdown.Item key={object.id} value={object.id} title={object.name} icon={object.icon} />
                  ))}
              </Form.Dropdown>
            );

          default:
            return null;
        }
      })}
    </Form>
  );
}
