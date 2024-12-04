import { Form } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";
import { randomUUID } from "crypto";
import { optionIcons } from "../enum/icons";

type SelectProps = {
  field: DataModelField;
};

const Select = ({ values }: { values: SelectProps }) => {
  const { field } = values;
  const { options } = field;
  const defaultValue = field.defaultValue ? field.defaultValue.replace(/^'|'$/g, "") : "";
  return (
    <Form.Dropdown title={field.label} defaultValue={defaultValue} id={field.name}>
      <Form.Dropdown.Item
        key={randomUUID().toString()}
        value={""}
        title={`No ${field.label}`}
        icon={optionIcons["white"]}
      />
      {options?.map((option) => (
        <Form.Dropdown.Item
          key={option.id}
          value={option.value ?? ""}
          title={option.label ?? ""}
          icon={optionIcons[option?.color ?? ""] ?? undefined}
        />
      ))}
    </Form.Dropdown>
  );
};

// Set display name for better debugging
Select.displayName = "Select";

export default Select;
