import { FormValidation, showFailureToast, useCachedState, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, COUNTRIES } from "./config";
import { Contact, ErrorResult, Result } from "./types";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";

export default function ListContacts() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-contact-details", false);
  const {
    isLoading,
    data: contacts,
    revalidate,
  } = useFetch(API_URL + "contacts", {
    headers: API_HEADERS,
    mapResult(result: Result<Contact[]>) {
      return {
        data: result.data,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {!isLoading && !contacts.length && (
        <List.EmptyView
          description="No Results"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.AddPerson}
                title="Create Contact"
                target={<CreateContact onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}
      {contacts.map((contact) => (
        <List.Item
          key={contact.id}
          icon={Icon.Person}
          title={contact.name}
          subtitle={isShowingDetail ? undefined : contact.email}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={contact.id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={contact.name} />
                  <List.Item.Detail.Metadata.Link
                    title="Email"
                    text={contact.email}
                    target={`mailto:${contact.email}`}
                  />
                  <List.Item.Detail.Metadata.Link title="Phone" text={contact.phone} target={`tel:${contact.phone}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindowSidebarLeft}
                title="Toggle Details"
                onAction={() => setIsShowingDetail((show) => !show)}
              />
              <Action.Push
                icon={Icon.AddPerson}
                title="Create Contact"
                target={<CreateContact onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateContact({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<Contact>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
      phone: FormValidation.Required,
      address: FormValidation.Required,
      city: FormValidation.Required,
      postcode: FormValidation.Required,
      country: FormValidation.Required,
    },
  });

  const { isLoading } = useFetch(API_URL + "contacts", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(values),
    async parseResponse(response) {
      if (!response.ok) {
        const result: ErrorResult = await response.json();
        throw new Error(result.message);
      }
      const result = await response.json();
      return result;
    },
    onError(error) {
      showFailureToast(error);
      setExecute(false);
    },
    onData() {
      onCreate();
      pop();
    },
    execute,
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Create Contact" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="John Doe" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="jdoe@example.com" {...itemProps.email} />
      <Form.TextField title="Phone" placeholder="+1 818 3000006" {...itemProps.phone} />
      <Form.TextField title="Address" placeholder="124, Bourdillon Boulevard" {...itemProps.address} />
      <Form.TextField title="City" placeholder="Round Rock" {...itemProps.city} />
      <Form.TextField title="Postcode" placeholder="78000" {...itemProps.postcode} />
      <Form.Dropdown title="Country" {...itemProps.country}>
        {Object.entries(COUNTRIES).map(([code, name]) => (
          <List.Dropdown.Item key={code} title={name} value={code} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
