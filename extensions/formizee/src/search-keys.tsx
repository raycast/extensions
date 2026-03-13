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
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { CreateKeyRequest, Key } from "./types";
import { formatDate } from "./utils";

export default function SearchKeys() {
  const {
    isLoading,
    data: keys,
    mutate,
  } = useFetch(FORMIZEE_URL + "keys", {
    headers: FORMIZEE_HEADERS,
    mapResult(result: { keys: Key[] }) {
      return {
        data: result.keys,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {keys.map((key) => (
        <List.Item
          key={key.id}
          icon={Icon.Key}
          title={key.name}
          accessories={[
            { text: `Last Access ${formatDate(key.lastAccess)}` },
            { text: `Expires At ${formatDate(key.expiresAt)}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Key" target={<NewKey />} onPop={mutate} />
              <Action
                icon={Icon.Xmark}
                title="Delete Key"
                onAction={() =>
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: "Delete Key",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete Permanently",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", key.name);
                        try {
                          await mutate(
                            fetch(FORMIZEE_URL + "key/" + key.id, {
                              method: "DELETE",
                              headers: FORMIZEE_HEADERS,
                            }).then(parseFormizeeResponse),
                            {
                              optimisticUpdate(data) {
                                return data.filter((k) => k.id !== key.id);
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
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewKey() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateKeyRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const response = await fetch(FORMIZEE_URL + "key", {
          method: "POST",
          headers: FORMIZEE_HEADERS,
          body: JSON.stringify(values),
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
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create API Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="What should your key be called?" {...itemProps.name} />
      <Form.Dropdown title="Expires At" {...itemProps.expiresAt}>
        <Form.Dropdown.Item title="1 Day" value="1-day" />
        <Form.Dropdown.Item title="7 Days" value="7-days" />
        <Form.Dropdown.Item title="30 Days" value="30-days" />
        <Form.Dropdown.Item title="60 Days" value="60-days" />
        <Form.Dropdown.Item title="90 Days" value="90-days" />
        <Form.Dropdown.Item title="180 Days" value="180-days" />
        <Form.Dropdown.Item title="1 Year" value="1-year" />
        <Form.Dropdown.Item title="Never" value="never" />
      </Form.Dropdown>
    </Form>
  );
}
