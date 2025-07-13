import { ItemProps } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";
import TextInput from "./TextInput";
import Select from "./Select";
import Rating from "./Rating";
import MultiSelect from "./MultiSelect";

type FieldComponentProps = {
  values: {
    field: DataModelField;
    itemProps: ItemProps;
  };
};
export default function FieldComponent({ values }: FieldComponentProps) {
  const { field, itemProps } = values;
  switch (field.type) {
    case "FULL_NAME":
    case "LINKS":
    case "EMAILS":
    case "TEXT": {
      return <TextInput values={{ field, placeholder: `Enter ${field.name}...` }} {...itemProps} />;
    }
    case "SELECT": {
      return <Select values={{ field }} {...itemProps} />;
    }
    case "RATING": {
      return <Rating values={{ field }} {...itemProps} />;
    }
    case "MULTI_SELECT": {
      return <MultiSelect values={{ field, placeholder: `Select ${field.name}...` }} {...itemProps} />;
    }
    default:
      return <></>;
  }
}
