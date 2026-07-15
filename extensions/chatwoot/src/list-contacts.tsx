import { FormValidation, getAvatarIcon, useCachedPromise, useForm } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Contact } from "./types";

export default function ListContacts() {
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    data: contacts,
    pagination,
    mutate,
  } = useCachedPromise(
    (q: string) => async (options: { page: number }) => {
      const currentPage = options.page + 1;
      const { meta, payload } = !q
        ? await chatwoot.contacts.list({ page: currentPage })
        : await chatwoot.contacts.search({ page: currentPage, q });
      return {
        data: payload,
        hasMore: meta.current_page === currentPage,
      };
    },
    [searchText],
    { initialData: [] },
  );

  function confirmAndDelete(contact: Contact) {
    confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: "Delete",
      message: "This action is permanent and irreversible.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", `${contact.id}`);
          try {
            await mutate(chatwoot.contacts.delete({ contactId: contact.id }), {
              optimisticUpdate(data) {
                return data.filter((c) => c.id !== contact.id);
              },
              shouldRevalidateAfter: false,
            });
            toast.style = Toast.Style.Success;
            toast.title = "Deleted";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed";
            toast.message = `${error}`;
          }
        },
      },
    });
  }

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setSearchText} throttle>
      {!isLoading && !contacts.length ? (
        searchText ? (
          <List.EmptyView title="No contacts matches your search 🔍" />
        ) : (
          <List.EmptyView
            title="No contacts found in this account"
            description="Start adding new contacts by clicking on the button below"
          />
        )
      ) : (
        contacts.map((contact) => (
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
                <Action
                  icon={Icon.RemovePerson}
                  title="Delete Contact"
                  onAction={() => confirmAndDelete(contact)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
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
