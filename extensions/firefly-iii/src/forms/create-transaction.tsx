import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { TransactionType } from "../types";
import { firefly } from "../firefly";

export default function CreateTransaction() {
  const { pop } = useNavigation();
  type FormValues = {
    type: TransactionType;
    description: string;
    date: Date | null;
    amount: string;
    source_id: string;
    destination_id: string;
  };
  const { isLoading, data: accounts } = useCachedPromise(
    async () => {
      const { data } = await firefly.accounts.list({ page: 1 });
      return data;
    },
    [],
    { initialData: [] },
  );
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        await firefly.transactions.create({
          transactions: [
            {
              ...values,
              date: (values.date as Date).toUTCString(),
            },
          ],
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      type: FormValidation.Required,
      description: FormValidation.Required,
      date: FormValidation.Required,
      amount(value) {
        if (!value) return "The item is required";
        if (!Number(value)) return "The value must be a number";
        if (+value < 1) return "The value must be more than zero";
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" onChange={(val) => setValue("type", val as TransactionType)}>
        <Form.Dropdown.Item title={TransactionType.withdrawal} value={TransactionType.withdrawal} />
        <Form.Dropdown.Item title={TransactionType.deposit} value={TransactionType.deposit} />
        <Form.Dropdown.Item title={TransactionType.transfer} value={TransactionType.transfer} />
      </Form.Dropdown>
      <Form.Dropdown title="Source" {...itemProps.source_id}>
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.id} title={account.attributes.name} value={account.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Destination" {...itemProps.destination_id}>
        {accounts.map((account) => (
          <Form.Dropdown.Item key={account.id} title={account.attributes.name} value={account.id} />
        ))}
      </Form.Dropdown>

      <Form.TextArea title="Description" placeholder="Description" {...itemProps.description} />
      <Form.DatePicker title="Date" {...itemProps.date} />
      <Form.TextField title="Amount" {...itemProps.amount} />
    </Form>
  );
}
