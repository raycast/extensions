import { Form, Icon, Image } from "@raycast/api";

import { notionColorToTintColor, getPageIcon } from "../../utils/notion";
import { DatabaseProperty, Page, User } from "../../utils/types";

interface PagePropertyFieldProp {
  property: Pick<DatabaseProperty, "id" | "name" | "type">;
  options?: DatabaseProperty["options"] | Page[] | User[];
}

export function PagePropertyField({ property, options }: PagePropertyFieldProp) {
  const id = "property::" + property.type + "::" + property.id;
  const title = property.name;

  let placeholder = property.type.replace(/_/g, " ");
  placeholder = placeholder.charAt(0).toUpperCase() + placeholder.slice(1);

  switch (property.type) {
    case "date":
      return <Form.DatePicker id={id} title={title} />;
    case "checkbox":
      return <Form.Checkbox id={id} title={title} label={placeholder} />;
    case "select":
      return (
        <Form.Dropdown id={id} title={title}>
          {options?.map(createMapOptionsFunc(Form.Dropdown.Item))}
        </Form.Dropdown>
      );
    case "multi_select":
    case "relation":
    case "people":
      return (
        <Form.TagPicker id={id} title={title} placeholder={placeholder}>
          {options?.map(createMapOptionsFunc(Form.TagPicker.Item))}
        </Form.TagPicker>
      );
    case "formula":
      return null;
    default:
      return <Form.TextField id={id} title={title} placeholder={placeholder} />;
  }
}

function createMapOptionsFunc(Tag: typeof Form.Dropdown.Item | typeof Form.TagPicker.Item) {
  return (option: NonNullable<PagePropertyFieldProp["options"]>[number]) => {
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
