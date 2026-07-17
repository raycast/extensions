import {
  List,
  Icon,
  ActionPanel,
  Action,
  Color,
  useNavigation,
  Form,
  showToast,
  Toast,
  Keyboard,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { inbound } from "./inbound";
import { EmailConfig, EndpointWithStats, PostEndpointsRequest } from "./types";

const ENDPOINT_ICONS: Record<EndpointWithStats["type"], Icon> = {
  webhook: Icon.Bolt,
  email: Icon.Envelope,
  email_group: Icon.TwoPeople,
};
export default function Endpoints() {
  const {
    isLoading,
    data: endpoints,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await inbound.endpoints.list();
      return data;
    },
    [],
    { initialData: [] },
  );

  const confirmAndDelete = async (endpoint: EndpointWithStats) => {
    const options: Alert.Options = {
      icon: Icon.Warning,
      title: "Delete Endpoint",
      message: `You are about to delete the webhook: ${endpoint.name}`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting Endpoint", endpoint.name);
    try {
      await mutate(inbound.endpoints.delete(endpoint.id), {
        optimisticUpdate(data) {
          return data.filter((e) => e.id !== endpoint.id);
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
  };

  return (
    <List isLoading={isLoading}>
      {!isLoading && !endpoints.length ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No endpoints configured"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.PlusCircle} title="Add Endpoint" target={<AddEndpoint />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        endpoints.map((endpoint) => (
          <List.Item
            key={endpoint.id}
            icon={ENDPOINT_ICONS[endpoint.type]}
            title={endpoint.name}
            subtitle={`API ID: ${endpoint.id}`}
            accessories={[
              {
                tag: endpoint.isActive
                  ? { value: "Active", color: Color.Blue }
                  : { value: "Inactive", color: Color.Red },
              },
              {
                text: new Date(endpoint.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.PlusCircle} title="Add Endpoint" target={<AddEndpoint />} onPop={mutate} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Endpoint"
                  onAction={() => confirmAndDelete(endpoint)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
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
function AddEndpoint() {
  const { pop } = useNavigation();
  type FormValues = {
    type: string;
    name: string;
    description: string;
  } & ({
    url: string;
    timeout: string;
    retryAttempts: string;
  } & EmailConfig & {
      emails: string;
    });
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding Endpoint", values.name);
      try {
        const { type, name, description, ...rest } = values;
        const config: PostEndpointsRequest["config"] =
          type === "webhook"
            ? {
                url: rest.url,
                timeout: +rest.timeout,
                retryAttempts: +rest.retryAttempts,
              }
            : type === "email"
              ? {
                  ...rest,
                }
              : {
                  ...rest,
                  emails: rest.emails.split("\n"),
                };
        const data = await inbound.endpoints.create({
          type: type as PostEndpointsRequest["type"],
          name,
          description,
          config,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        toast.message = data.name;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      type: "webhook",
      timeout: "30",
      retryAttempts: "3",
      includeAttachments: true,
    },
    validation: {
      type: FormValidation.Required,
      name: FormValidation.Required,
      url(value) {
        if (values.type === "webhook" && !value) return "The item is required";
      },
      timeout(value) {
        if (values.type === "webhook") {
          if (!value) return "The item is required";
          if (!Number(value)) return "The item must be a number";
          if (+value < 1 || +value > 300) return "Timeout must be between 1 and 300 seconds";
        }
      },
      retryAttempts(value) {
        if (values.type === "webhook") {
          if (!value) return "The item is required";
          if (!Number(value)) return "The item must be a number";
          if (+value < 0 || +value > 10) return "Retry attempts must be between 0 and 10";
        }
      },
      forwardTo(value) {
        if (values.type === "email" && !value) return "The item is required";
      },
      emails(value) {
        if (values.type === "email_group" && !value) return "The item is required";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Add Endpoint" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" info="Choose how you want to receive emails" {...itemProps.type}>
        <Form.Dropdown.Item icon={ENDPOINT_ICONS.webhook} title="Webhook" value="webhook" />
        <Form.Dropdown.Item icon={ENDPOINT_ICONS.email} title="Email" value="email" />
        <Form.Dropdown.Item icon={ENDPOINT_ICONS.email_group} title="Email Group" value="email_group" />
      </Form.Dropdown>
      <Form.Separator />
      {values.type === "webhook" ? (
        <>
          <Form.TextField
            title="Webhook URL"
            placeholder="https://your-app.com/webhooks/inbound"
            info="The URL where webhook payloads will be sent via HTTP POST."
            {...itemProps.url}
          />
          <Form.TextField title="Name" {...itemProps.name} />
          <Form.TextArea
            title="Description"
            info="Optional description of this endpoint's purpose"
            {...itemProps.description}
          />
          <Form.Separator />
          <Form.TextField title="Timeout (seconds)" {...itemProps.timeout} />
          <Form.TextField title="Retry Attempts" {...itemProps.retryAttempts} />
        </>
      ) : values.type === "email" ? (
        <>
          <Form.TextField title="Forward To Email" placeholder="support@yourcompany.com" {...itemProps.forwardTo} />
          <Form.TextField title="Name" {...itemProps.name} />
          <Form.TextArea
            title="Description"
            info="Optional description of this endpoint's purpose"
            {...itemProps.description}
          />
          <Form.Separator />
          <Form.TextField
            title="Sender Name"
            placeholder="Support Team (leave empty for 'Original Sender via Inbound')"
            info='Custom display name for forwarded emails. If empty, will use "Original Sender via Inbound" format.'
            {...itemProps.senderName}
          />
          <Form.TextField
            title="Subject Prefix"
            placeholder="[Forwarded]"
            info="Optional prefix to add to forwarded email subjects"
            {...itemProps.subjectPrefix}
          />
          <Form.Checkbox
            label="Include Attachments"
            info="Forward email attachments"
            {...itemProps.includeAttachments}
          />
        </>
      ) : (
        <>
          <Form.TextField title="Name" {...itemProps.name} />
          <Form.TextArea
            title="Description"
            info="Optional description of this endpoint's purpose"
            {...itemProps.description}
          />
          <Form.Separator />
          <Form.TextArea
            title="Email Recipients"
            placeholder={`recipient1@example.com\nrecipient2@example.com`}
            {...itemProps.emails}
          />
          <Form.TextField
            title="Sender Name"
            placeholder="Support Team (leave empty for 'Original Sender via Inbound')"
            info='Custom display name for forwarded emails. If empty, will use "Original Sender via Inbound" format.'
            {...itemProps.forwardTo}
          />
          <Form.TextField
            title="Subject Prefix"
            placeholder="[Forwarded]"
            info="Optional prefix to add to forwarded email subjects"
            {...itemProps.subjectPrefix}
          />
          <Form.Checkbox
            label="Include Attachments"
            info="Forward email attachments"
            {...itemProps.includeAttachments}
          />
        </>
      )}
    </Form>
  );
}
