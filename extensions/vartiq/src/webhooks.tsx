import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Color,
  Alert,
  showToast,
  Toast,
  useNavigation,
  Form,
  Keyboard,
} from "@raycast/api";
import { useForm, FormValidation, useCachedPromise } from "@raycast/utils";
import { vartiq } from "./vartiq";
import { CreateWebhookInput } from "vartiq";
import WebhookMessages from "./webhook-messages";

export default function Webhooks({ appId, navigationTitle }: { appId: string; navigationTitle: string }) {
  const {
    isLoading,
    data: webhooks,
    error,
    mutate,
  } = useCachedPromise(
    async (appId: string) => {
      const { data } = await vartiq.webhook.list(appId);
      return data;
    },
    [appId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle}>
      {!isLoading && !webhooks.length && !error ? (
        <List.EmptyView
          icon="folder-icon.svg"
          title="No webhook found"
          description="To get started sending webhooks to your destinations, create a webhook in your app"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create Webhook"
                target={<CreateWebhook appId={appId} navigationTitle={`${navigationTitle} / Create`} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        webhooks.map((webhook) => (
          <List.Item
            key={webhook.id}
            icon="webhook.svg"
            title={webhook.url}
            subtitle={webhook.id}
            accessories={[
              {
                date: new Date(webhook.createdAt),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.LineChart}
                  title="Webhook Messages"
                  target={<WebhookMessages webhookId={webhook.id} navigationTitle={`... / ${webhook.id} / Messages`} />}
                />
                <Action.CopyToClipboard title="Copy ID to Clipboard" content={webhook.id} />
                <Action.Push
                  shortcut={Keyboard.Shortcut.Common.New}
                  icon={Icon.Plus}
                  title="Create Webhook"
                  target={<CreateWebhook appId={appId} navigationTitle={`${navigationTitle} / Create`} />}
                  onPop={mutate}
                />
                <Action
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  icon={Icon.Trash}
                  title="Delete Webhook"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Delete Webhook",
                      message: "Are you sure you want to delete this webhook? This action cannot be undone.",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", webhook.url);
                          try {
                            await mutate(vartiq.webhook.delete(webhook.id), {
                              optimisticUpdate(data) {
                                return (data ?? []).filter((w) => w.id !== webhook.id);
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
                    })
                  }
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

function CreateWebhook({ appId, navigationTitle }: { appId: string; navigationTitle: string }) {
  const { pop } = useNavigation();

  type FormValues = {
    url: string;
    authMethod: string;
    user: string;
    pass: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.url);
      try {
        const { authMethod, user, pass } = values;
        let input: Partial<CreateWebhookInput> = {};
        const base = { appId, url: values.url };
        switch (authMethod) {
          case "basic":
            input = {
              ...base,
              authMethod: "basic",
              userName: user,
              password: pass,
            } as CreateWebhookInput;
            break;
          case "hmac":
            input = {
              ...base,
              authMethod: "hmac",
              hmacHeader: user,
              hmacSecret: pass,
            } as CreateWebhookInput;
            break;
          case "apiKey":
            input = {
              ...base,
              authMethod: "apiKey",
              apiKeyHeader: user,
              apiKey: pass,
            } as CreateWebhookInput;
            break;
          default:
            input = base;
            break;
        }
        await vartiq.webhook.create(input as CreateWebhookInput);
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
      url: FormValidation.Required,
      user(value) {
        if (values.authMethod && !value) return "The item is required";
      },
      pass(value) {
        if (values.authMethod && !value) return "The item is required";
      },
    },
  });
  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Webhook" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://vartiq.com" {...itemProps.url} />
      <Form.Separator />
      <Form.Dropdown title="Authentication Method" {...itemProps.authMethod}>
        <Form.Dropdown.Item title="None" value="" />
        <Form.Dropdown.Item title="Basic Auth" value="basic" />
        <Form.Dropdown.Item title="HMAC Signature" value="hmac" />
        <Form.Dropdown.Item title="Api Key" value="apiKey" />
      </Form.Dropdown>
      {values.authMethod && (
        <>
          <Form.TextField
            title={
              values.authMethod === "basic"
                ? "Username"
                : values.authMethod === "hmac"
                  ? "HMAC Header"
                  : "ApiKey Header"
            }
            placeholder={values.authMethod === "basic" ? "user@vartiq.com" : ""}
            {...itemProps.user}
          />
          <Form.PasswordField
            title={values.authMethod === "basic" ? "Password" : values.authMethod === "hmac" ? "HMAC Secret" : "ApiKey"}
            placeholder={values.authMethod === "basic" ? "Enter your password" : ""}
            {...itemProps.pass}
          />
        </>
      )}
    </Form>
  );
}
