import { Form, Icon, Image } from "@raycast/api";
import type { useForm } from "@raycast/utils";

import {
  notionColorToTintColor,
  getPageIcon,
  Page,
  DatabaseProperty,
  User,
  PropertyConfig,
  ReadablePropertyType,
  FormValueForDatabaseProperty,
} from "../../utils/notion";

// @ts-expect-error - Overload doesn't match, but is the function signature we want to be visisble.
export function PagePropertyField(props: {
  type: ReadablePropertyType;
  databaseProperty: DatabaseProperty;
  itemProps: ReturnType<typeof useForm>["itemProps"][string];
  relationPages: Record<string, Page[]> | undefined;
  users: User[];
}): JSX.Element;
export function PagePropertyField({
  type,
  databaseProperty,
  itemProps,
  relationPages,
  users,
}: {
  [DP in DatabaseProperty as DP["type"]]: {
    type: DP["type"];
    databaseProperty: DP;
    itemProps: Form.ItemProps<FormValueForDatabaseProperty<DP["type"]>>;
    relationPages: Record<string, Page[]> | undefined;
    users: User[];
  };
}[ReadablePropertyType]) {
  // Note: `key` shouldn't be passed to a react component with the spread opperator.
  const sharedProps = { title: databaseProperty.name, placeholder: createPlaceholder(databaseProperty) };
  switch (type) {
    case "date":
      return <Form.DatePicker {...itemProps} {...sharedProps} key={itemProps.id} />;
    case "checkbox":
      return <Form.Checkbox {...itemProps} {...sharedProps} key={itemProps.id} label={sharedProps.placeholder} />;
    case "select":
    case "status":
      return (
        <Form.Dropdown {...itemProps} {...sharedProps} key={itemProps.id}>
          {databaseProperty.config.options.map(createMapOptionsFunc(Form.Dropdown.Item))}
        </Form.Dropdown>
      );
    case "multi_select":
    case "relation":
    case "people": {
      let options: ItemOption[] | Page[] | User[] | undefined;
      if (databaseProperty.type == "multi_select") options = databaseProperty.config.options;
      else if (databaseProperty.type == "people") options = users;
      else if (relationPages && databaseProperty.type == "relation") {
        const relationId = databaseProperty.config.database_id;
        if (relationId) options = relationPages[relationId];
      }
      return (
        <Form.TagPicker {...itemProps} {...sharedProps} key={itemProps.id}>
          {options?.map(createMapOptionsFunc(Form.TagPicker.Item))}
        </Form.TagPicker>
      );
    }
    case "formula":
      return null;
    case "title":
      return (
        <Form.TextField
          {...itemProps}
          {...sharedProps}
          key={itemProps.id}
          info="Supports a single line of inline Markdown"
        />
      );
    default:
      return (
        <Form.TextField
          {...itemProps}
          {...sharedProps}
          key={itemProps.id}
          info="Supports a single line of inline Markdown"
        />
      );
  }
}

type ItemOption = PropertyConfig<"select">["options"][number];
function createMapOptionsFunc(Tag: typeof Form.Dropdown.Item | typeof Form.TagPicker.Item) {
  return (option: ItemOption | Page | User) => {
    if (!option.id) return null;
    let title: string | null;
    let icon: Image.ImageLike | undefined;
    if ("type" in option) {
      title = option.name;
      icon = option.avatar_url ? { source: option.avatar_url, mask: Image.Mask.Circle } : undefined;
    } else if ("object" in option) {
      title = option.title;
      icon = getPageIcon(option);
    } else {
      title = option.name;
      icon = option.color ? { source: Icon.Dot, tintColor: notionColorToTintColor(option.color) } : undefined;
    }
    return <Tag key={"option::" + option.id} value={option.id} title={title ?? "Untitled"} icon={icon} />;
  };
}

function createPlaceholder(property: DatabaseProperty) {
  let placeholder = property.type.replace(/_/g, " ");
  placeholder = placeholder.charAt(0).toUpperCase() + placeholder.slice(1);
  return placeholder;
}
