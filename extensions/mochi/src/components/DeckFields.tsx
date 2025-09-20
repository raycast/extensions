import { Form } from "@raycast/api";
import { Field } from "../types";

type Props = {
  fieldsRefs: React.MutableRefObject<Form.TextArea[] | Form.Checkbox[] | Form.TextField[]>;
  fields: Field[];
};

const FormFields = ({ fields, fieldsRefs }: Props) => {
  if (!fields) return null;
  fieldsRefs.current = [];

  // if no fields, return default content field
  if (!fields.length) {
    return (
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter content"
        key="content"
        enableMarkdown
        ref={(element) => fieldsRefs.current.push(element as Form.TextArea)}
      />
    );
  }

  return (
    <>
      {fields.map((field, i) => {
        if (field.type === "text") {
          if (field.multiline) {
            return (
              <Form.TextArea
                id={field.id}
                title={field.name}
                placeholder={`Enter ${field.name}`}
                key={field.name}
                ref={(element) => fieldsRefs.current.push(element as Form.TextArea)}
                autoFocus={i === 0}
              />
            );
          } else {
            return (
              <Form.TextField
                id={field.id}
                title={field.name}
                placeholder={`Enter ${field.name}`}
                key={field.name}
                ref={(element) => fieldsRefs.current.push(element as Form.TextField)}
                autoFocus={i === 0}
              />
            );
          }
        }
        if (field.type === "boolean") {
          return (
            <Form.Checkbox
              id={field.id}
              label={field.name}
              key={field.name}
              defaultValue={field.defaultCheck}
              ref={(element) => fieldsRefs.current.push(element as Form.Checkbox)}
              autoFocus={i === 0}
            />
          );
        }
      })}
    </>
  );
};

export default FormFields;
