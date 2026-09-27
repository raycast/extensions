import { Form } from "@raycast/api";
import { Field } from "../utils/schema";

const asString = (value: unknown) => (value === undefined || value === null ? "" : String(value));

type Props = {
  field: Field;
  defaultValue?: string;
};
export const ModelField = ({ field, defaultValue }: Props) => {
  const title = field.required ? `${field.title} *` : field.title;
  const value = defaultValue ?? asString(field.schema.default);

  if (field.kind === "select") {
    return (
      <Form.Dropdown id={field.name} title={title} info={field.info} defaultValue={value || field.enums[0]}>
        {field.enums.map((option) => (
          <Form.Dropdown.Item key={option} value={asString(option)} title={asString(option)} />
        ))}
      </Form.Dropdown>
    );
  }

  if (field.kind === "boolean") {
    return (
      <Form.Checkbox
        id={field.name}
        title={title}
        label={field.title}
        info={field.info}
        defaultValue={value === "true"}
      />
    );
  }

  if (field.kind === "file") {
    return (
      <>
        <Form.FilePicker id={field.name} title={title} info={field.info} allowMultipleSelection={false} />
        <Form.TextField
          id={`${field.name}__url`}
          title={`${field.title} URL`}
          placeholder="https://"
          defaultValue={value}
        />
      </>
    );
  }

  if (field.kind === "textarea") {
    return <Form.TextArea id={field.name} title={title} info={field.info} defaultValue={value} />;
  }

  return <Form.TextField id={field.name} title={title} info={field.info} defaultValue={value} />;
};
