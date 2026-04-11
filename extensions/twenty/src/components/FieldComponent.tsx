import { ItemProps } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";
import TextInput from "./TextInput";
import Select from "./Select";
import Rating from "./Rating";
import MultiSelect from "./MultiSelect";
import BooleanField from "./BooleanField";
import CurrencyField from "./CurrencyField";
import PhoneField from "./PhoneField";

type FieldComponentProps = {
  field: DataModelField;
  itemProps: Record<string, ItemProps>;
};

export default function FieldComponent({ field, itemProps }: FieldComponentProps) {
  switch (field.type) {
    case "FULL_NAME":
    case "LINKS":
    case "EMAILS":
    case "TEXT": {
      return <TextInput values={{ field, placeholder: `Enter ${field.name}...` }} {...(itemProps[field.name] ?? {})} />;
    }
    case "SELECT": {
      return <Select values={{ field }} {...(itemProps[field.name] ?? {})} />;
    }
    case "RATING": {
      return <Rating values={{ field }} {...(itemProps[field.name] ?? {})} />;
    }
    case "MULTI_SELECT": {
      return (
        <MultiSelect values={{ field, placeholder: `Select ${field.name}...` }} {...(itemProps[field.name] ?? {})} />
      );
    }
    case "BOOLEAN": {
      return <BooleanField field={field} itemProps={itemProps} />;
    }
    case "CURRENCY": {
      return <CurrencyField field={field} itemProps={itemProps} />;
    }
    case "PHONES": {
      return <PhoneField field={field} itemProps={itemProps} />;
    }
    default:
      return null;
  }
}
