import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { buildUrl, sendportalRequest } from "./sendportal";
import { CreateSubscriberRequest, PaginatedResult, Subscriber, SuccessResult, Tag } from "./types";
import { useState } from "react";

export default function Subscribers() {
  const [filter, setFilter] = useState("all");
  const {
    isLoading,
    data: subscribers,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const { data, links } = await sendportalRequest<PaginatedResult<Subscriber>>(options.cursor ?? "subscribers");
      return {
        data,
        hasMore: !!links.next,
        cursor: links.next,
      };
    },
    [],
    { initialData: [] },
  );

  const confirmAndDelete = (subscriber: Subscriber) => {
    confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `Delete "${subscriber.email}"?`,
      message: "Are you sure you want to permanently delete this subscriber and all associated data?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", subscriber.email);
          try {
            await mutate(sendportalRequest(`subscribers/${subscriber.id}`, { method: "DELETE" }), {
              optimisticUpdate(data) {
                return data.filter((s) => s.id !== subscriber.id);
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
  };

  const filtered =
    filter === "all"
      ? subscribers
      : subscribers.filter((s) => (filter === "subscribed" ? s.unsubscribed_at === null : s.unsubscribed_at !== null));

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Subscribed" value="subscribed" />
          <List.Dropdown.Item title="Unsubscribed" value="unsubscribed" />
        </List.Dropdown>
      }
    >
      {!isLoading && !filtered.length ? (
        <List.EmptyView
          title="No Subscribers Found"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Subscriber" target={<NewSubscriber />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        filtered.map((subscriber) => (
          <List.Item
            key={subscriber.id}
            icon={Icon.Person}
            title={subscriber.email}
            subtitle={`${subscriber.first_name ?? ""} ${subscriber.last_name ?? ""}`}
            accessories={[
              {
                tag: subscriber.unsubscribed_at
                  ? { value: "Unsubscribed", color: Color.Red }
                  : { value: "Subscribed", color: Color.Green },
              },
              { date: new Date(subscriber.created_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={buildUrl(`subscribers/${subscriber.id}`)} />
                <Action.Push icon={Icon.AddPerson} title="New Subscriber" target={<NewSubscriber />} onPop={mutate} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Subscriber"
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(subscriber)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewSubscriber() {
  const { pop } = useNavigation();
  const { isLoading, data: tags } = useCachedPromise(
    async () => {
      const { data } = await sendportalRequest<PaginatedResult<Tag>>("tags");
      return data;
    },
    [],
    { initialData: [] },
  );
  const { handleSubmit, itemProps } = useForm<CreateSubscriberRequest & { tags: string[]; subscribed: boolean }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.email);
      try {
        const body = {
          ...values,
          tags: values.tags.map((tag) => +tag),
          unsubscribed_at: values.subscribed ? undefined : new Date().toISOString(),
        };
        const { data } = await sendportalRequest<SuccessResult<Subscriber>>("subscribers", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = data.email;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      subscribed: true,
    },
    validation: {
      email: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" {...itemProps.email} />
      <Form.TextField title="First Name" {...itemProps.first_name} />
      <Form.TextField title="Last Name" {...itemProps.last_name} />
      <Form.TagPicker title="Tags" placeholder="Nothing selected" {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} icon={Icon.Tag} title={tag.name} value={tag.id.toString()} />
        ))}
      </Form.TagPicker>
      <Form.Checkbox label="Subscribed" {...itemProps.subscribed} />
    </Form>
  );
}
