import { FormValidation, getAvatarIcon, useCachedPromise, useForm } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";

export default function ListContacts() {
  const {
    isLoading,
    data: contacts,
    pagination,
    mutate,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      const { meta, payload } = await chatwoot.contacts.list({ page: options.page + 1 });
      return {
        data: payload,
        hasMore: meta.current_page === options.page + 1,
      };
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {contacts.map((contact) => (
        <List.Item
          key={contact.id}
          icon={contact.thumbnail || getAvatarIcon(contact.name)}
          title={contact.name}
          subtitle={contact.email}
          accessories={[
            { icon: Icon.Building, text: contact.additional_attributes.company_name },
            { date: new Date(contact.created_at * 1000) },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.AddPerson} title="Add Contact" target={<AddContact />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddContact() {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    email: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
      try {
        await chatwoot.contacts.create({ contact: values });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Add Contact" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextField title="Email Address" {...itemProps.email} />
    </Form>
  );
}
