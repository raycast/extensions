import { useFetch, useForm } from "@raycast/utils";
import { FORMIZEE_HEADERS, FORMIZEE_URL, parseFormizeeResponse } from "./formizee";
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
import { CreateEndpointRequest, Endpoint } from "./types";
import Submissions from "./submissions";

export default function SearchForms() {
  const {
    isLoading,
    data: forms,
    mutate,
  } = useFetch(FORMIZEE_URL + "endpoints", {
    headers: FORMIZEE_HEADERS,
    mapResult(result: { endpoints: Endpoint[] }) {
      return {
        data: result.endpoints,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {forms.map((form) => (
        <List.Item
          key={form.id}
          icon={{ source: Icon.Document, tintColor: form.color }}
          title={form.name}
          subtitle={form.slug}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Tray} title="Submissions" target={<Submissions form={form} />} />
              <Action.Push icon={Icon.Plus} title="Create New Form" target={<NewForm />} onPop={mutate} />
              <Action
                icon={Icon.Xmark}
                title="Delete Form"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Delete Form",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete Permanently",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", form.name);
                        try {
                          await mutate(
                            fetch(FORMIZEE_URL + "endpoint/" + form.id, {
                              method: "DELETE",
                              headers: FORMIZEE_HEADERS,
                            }).then(parseFormizeeResponse),
                            {
                              optimisticUpdate(data) {
                                return data.filter((d) => d.id !== form.id);
                              },
                              shouldRevalidateAfter: false,
                            },
                          );
                          toast.style = Toast.Style.Success;
                          toast.title = "Deleted";
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = `${error}`;
                        }
                      },
                    },
                  })
                }
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewForm() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateEndpointRequest & { targetEmails: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const response = await fetch(FORMIZEE_URL + "endpoint", {
          method: "POST",
          headers: FORMIZEE_HEADERS,
          body: JSON.stringify({
            ...values,
            targetEmails: !values.targetEmails ? [] : values.targetEmails.replaceAll(" ", "").split(","),
          }),
        });
        await parseFormizeeResponse(response);
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
      name(value) {
        if (!value || value.length < 4 || value.length > 64) return "The name must be between 4 and 64 characters long";
      },
      slug(value) {
        if (!value || value.length < 4 || value.length > 64) return "The slug must be between 4 and 64 characters long";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Let's Build" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="What should your form be called?" {...itemProps.name} />
      <Form.TextField
        title="Slug"
        placeholder="This is the form namespace inside your workspace."
        {...itemProps.slug}
      />
      <Form.TextField title="Target Emails" {...itemProps.targetEmails} />
    </Form>
  );
}
