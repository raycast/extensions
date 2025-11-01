import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { formatRFC3339 } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { updateObject } from "../../api";
import { useSearch, useTagsMap } from "../../hooks";
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
import { bundledPropKeys, defaultTintColor, getNumberFieldValidations, isEmoji } from "../../utils";

interface UpdateObjectFormValues {
  name?: string;
  icon?: string;
  description?: string;
  [key: string]: PropertyFieldValue;
}

interface UpdateObjectFormProps {
  spaceId: string;
  object: RawSpaceObjectWithBody;
  mutateObjects: MutatePromise<SpaceObject[]>[];
  mutateObject?: MutatePromise<SpaceObjectWithBody | undefined>;
}

export function UpdateObjectForm({ spaceId, object, mutateObjects, mutateObject }: UpdateObjectFormProps) {
  const { pop } = useNavigation();
  const [objectSearchText, setObjectSearchText] = useState("");

  const properties = object.type.properties.filter((p) => !Object.values(bundledPropKeys).includes(p.key));
  const numberFieldValidations = useMemo(() => getNumberFieldValidations(properties), [properties]);

  const { objects, objectsError, isLoadingObjects } = useSearch(spaceId, objectSearchText, []);
  const { tagsMap, tagsError, isLoadingTags } = useTagsMap(
    spaceId,
    properties
      .filter((prop) => prop.format === PropertyFormat.Select || prop.format === PropertyFormat.MultiSelect)
      .map((prop) => prop.id),
  );

  useEffect(() => {
    if (objectsError || tagsError) {
      showFailureToast(objectsError || tagsError, { title: "Failed to load data" });
    }
  }, [objectsError, tagsError]);

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
    ...initialPropertyValues,
  };

  const { handleSubmit, itemProps } = useForm<UpdateObjectFormValues>({
    initialValues: initialValues,
    onSubmit: async (values) => {
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
        let iconPayload: ObjectIcon | undefined;
        if (iconField !== initialIconValue) {
          iconPayload = { format: IconFormat.Emoji, emoji: iconField };
        }

        const payload: UpdateObjectRequest = {
          name: values.name,
          ...(iconPayload !== undefined && { icon: iconPayload }),
          properties: propertiesEntries,
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
      navigationTitle={`Edit ${object.type.name}`}
      isLoading={isLoadingObjects || isLoadingTags}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
                {objects
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
