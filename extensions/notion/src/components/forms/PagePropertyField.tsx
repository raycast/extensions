import { Form, Icon, Image, showToast, Toast } from "@raycast/api";

import { notionColorToTintColor, getPageIcon } from "../../utils/notion";
import { DatabaseProperty, Page, User } from "../../utils/types";

interface PagePropertyFieldProp {
  property: Pick<DatabaseProperty, "id" | "name" | "type">;
  options?: DatabaseProperty["options"] | Page[] | User[];
  defaultValue?: Form.Value;
}

export function PagePropertyField({ property, options, defaultValue }: PagePropertyFieldProp) {
  const id = "property::" + property.type + "::" + property.id;
  const title = property.name;

  let placeholder = property.type.replace(/_/g, " ");
  placeholder = placeholder.charAt(0).toUpperCase() + placeholder.slice(1);

  function typeCheck(value: Form.Value | undefined, expected: "string"): string | undefined;
  function typeCheck(value: Form.Value | undefined, expected: "boolean"): boolean | undefined;
  function typeCheck(value: Form.Value | undefined, expected: "string[]"): string[] | undefined;
  function typeCheck(value: Form.Value | undefined, expected: "Date"): Date | undefined;
  function typeCheck(
    value: Form.Value | undefined,
    expected: "string" | "boolean" | "string[]" | "Date",
  ): string | boolean | string[] | Date | undefined | null {
    if (value === undefined || value === null) {
      return value;
    } else if (expected == "boolean") {
      if (typeof value == "boolean") return value;
    } else if (expected == "string[]") {
      if (isStrArray(value)) return value;
    } else if (typeof value == "string") {
      if (expected == "string") return value;
      else if (expected == "Date") {
        try {
          return new Date(value);
        } catch {
          // eslint-disable-line no-empty
        }
      }
    }
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid default type for " + property.name,
      message: `Expected ${expected} but recieved "${value}"`,
    });
  }

  switch (property.type) {
    case "date":
      return <Form.DatePicker id={id} title={title} defaultValue={typeCheck(defaultValue, "Date")} />;
    case "checkbox":
      return (
        <Form.Checkbox id={id} title={title} label={placeholder} defaultValue={typeCheck(defaultValue, "boolean")} />
      );
    case "select":
    case "status":
      return (
        <Form.Dropdown id={id} title={title} defaultValue={typeCheck(defaultValue, "string")}>
          {options?.map(createMapOptionsFunc(Form.Dropdown.Item))}
        </Form.Dropdown>
      );
    case "multi_select":
    case "relation":
    case "people":
      return (
        <Form.TagPicker
          id={id}
          title={title}
          placeholder={placeholder}
          defaultValue={typeCheck(defaultValue, "string[]")}
        >
          {options?.map(createMapOptionsFunc(Form.TagPicker.Item))}
        </Form.TagPicker>
      );
    case "formula":
      return null;
    default:
      return (
        <Form.TextField
          id={id}
          title={title}
          placeholder={placeholder}
          defaultValue={typeCheck(defaultValue, "string")}
        />
      );
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

function isStrArray(value: unknown): value is string[] {
  return Array.isArray(value) && (value.length == 0 || typeof value[0] == "string");
}
