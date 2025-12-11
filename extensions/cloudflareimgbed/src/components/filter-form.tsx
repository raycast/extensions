import { ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ListQuery } from "../api/interfaces";

type FilterFormProps = {
  initialValues: ListQuery;
  onSubmit: (values: ListQuery) => void;
};

export function FilterForm({ initialValues, onSubmit }: FilterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  const handleSubmit = (values: ListQuery) => {
    setIsSubmitting(true);
    try {
      onSubmit(values);
      pop();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filters" onSubmit={(values) => handleSubmit(values as ListQuery)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="dir" title="Directory" defaultValue={initialValues.dir ?? ""} />
      <Form.TextField
        id="includeTags"
        title="Include Tags (comma separated)"
        defaultValue={initialValues.includeTags ?? ""}
      />
      <Form.TextField
        id="excludeTags"
        title="Exclude Tags (comma separated)"
        defaultValue={initialValues.excludeTags ?? ""}
      />
      <Form.TextField
        id="channel"
        title="Channel"
        placeholder="telegram/cfr2/s3"
        defaultValue={initialValues.channel ?? ""}
      />
      <Form.Dropdown id="listType" title="List Type" defaultValue={initialValues.listType ?? ""}>
        <Form.Dropdown.Item value="" title="All" />
        <Form.Dropdown.Item value="None" title="None" />
        <Form.Dropdown.Item value="Block" title="Block" />
        <Form.Dropdown.Item value="White" title="White" />
      </Form.Dropdown>
      <Form.Checkbox id="recursive" label="Include subdirectories" defaultValue={initialValues.recursive ?? false} />
    </Form>
  );
}
