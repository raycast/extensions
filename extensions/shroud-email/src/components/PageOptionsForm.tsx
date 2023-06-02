import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { PageOptionsParameters } from "../utils/types";

type Props = {
  onOptionsSelected: (page_size: string, page: string) => void;
};
export default function PageOptionsForm({ onOptionsSelected }: Props) {
  const { handleSubmit, itemProps } = useForm<PageOptionsParameters>({
    async onSubmit(values) {
      onOptionsSelected(values.page_size, values.page);
    },
    validation: {
      page_size(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
        else if (Number(value) < 1) return "The item must be greater than '1'";
      },
      page(value) {
        if (!value) return "The item is required";
        else if (!Number(value)) return "The item must be a number";
        else if (Number(value) < 1) return "The item must be greater than '1'";
      },
    },
    initialValues: {
      page_size: "20",
      page: "1",
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Page Size" info="Number of items to fetch in a batch" {...itemProps.page_size} />
      <Form.TextField title="Page" info="Page/Batch to fetch" {...itemProps.page} />
    </Form>
  );
}
