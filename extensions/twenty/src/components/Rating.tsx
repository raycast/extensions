import { Form } from "@raycast/api";
import { DataModelField } from "../services/zod/schema/recordFieldSchema";

type RatingProps = {
  field: DataModelField;
};

const Rating = ({ values }: { values: RatingProps }) => {
  const { field } = values;
  const defaultValue = "";

  // Generate star rating options (1 to 5)
  const options = Array.from({ length: 5 }, (_, i) => ({
    title: "⭐️".repeat(i + 1),
    value: `RATING_${i + 1}`,
  }));

  return (
    <Form.Dropdown title={field.label} defaultValue={defaultValue} id={field.name}>
      <Form.Dropdown.Item
        key={"NO_RATING"}
        value={""}
        title={`No ${field.label}`}
        icon={""}
      />
      {options.map((option) => (
        <Form.Dropdown.Item 
          key={option.value}
          value={option.value ?? ""}
          title={option.title ?? ""}
          icon={""}
        />
      ))}
    </Form.Dropdown>
  );
};

// Set display name for better debugging
Rating.displayName = "Rating";

export default Rating;
