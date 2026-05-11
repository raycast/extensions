import {
  ApiKeyCreateDto,
  ApiKeyResponseDto,
  createApiKey,
  deleteApiKey,
  getApiKeys,
  isHttpError,
  Permission,
} from "@immich/sdk";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { initialize } from "./immich";

export default function APIKeys() {
  const { isLoading, data, mutate } = useCachedPromise(
    async () => {
      initialize();
      const res = await getApiKeys();
      return res;
    },
    [],
    { initialData: [] },
  );

  const confirmAndDelete = async (key: ApiKeyResponseDto) => {
    await confirmAlert({
      icon: "immich_new.png",
      title: "Confirm",
      message: "Are you sure you want to delete this API key?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", key.name);
          try {
            await mutate(deleteApiKey({ id: key.id }), {
              optimisticUpdate(data) {
                return data.filter((k) => k.id !== key.id);
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

  return (
    <List isLoading={isLoading}>
      {data.map((key) => (
        <List.Item
          key={key.id}
          icon={Icon.Key}
          title={key.name}
          subtitle={key.permissions.join()}
          accessories={[{ date: new Date(key.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New API Key" target={<NewAPIKey />} onPop={mutate} />
              <Action
                icon={Icon.Trash}
                title="Delete API Key"
                onAction={() => confirmAndDelete(key)}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewAPIKey() {
  const { pop } = useNavigation();
  type FormValues = { selectAll: boolean } & Omit<ApiKeyCreateDto, "permissions"> & { permissions: string[] };
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const res = await createApiKey({
          apiKeyCreateDto: {
            name: values.name,
            permissions: values.selectAll ? Object.values(Permission) : (values.permissions as Permission[]),
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = res.apiKey.name;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = isHttpError(error)
          ? `${Array.isArray(error.data.message) ? error.data.message[0] : error.data.message}`
          : `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      permissions: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="New API Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="API Key" {...itemProps.name} />
      <Form.Checkbox label="Select all" {...itemProps.selectAll} />
      {!values.selectAll && (
        <Form.TagPicker title="Permission" placeholder="Search" {...itemProps.permissions}>
          {Object.entries(Permission).map(([key, val]) => (
            <Form.TagPicker.Item key={key} title={key} value={val} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
