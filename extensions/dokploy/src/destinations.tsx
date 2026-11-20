import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { type Instance, useToken, useInstanceScope, tokenForInstance } from "./instances";
import { Destination, ErrorResult } from "./interfaces";
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
import { DESTINATION_PROVIDERS } from "./config";

export default function Destinations({ instance: initial }: { instance: Instance }) {
  const { url, headers, instance, dropdown } = useInstanceScope(initial);

  const {
    isLoading,
    data: destinations,
    revalidate,
    mutate,
  } = useFetch<Destination[], Destination[]>(url + "destination.all", {
    headers,
    initialData: [],
  });

  async function deleteDestination(destination: Destination) {
    const options: Alert.Options = {
      title: "Are you sure you want to delete this destination?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Confirm",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting destination", destination.name);
      try {
        await mutate(
          fetch(url + "destination.remove", {
            method: "POST",
            headers,
            body: JSON.stringify({ destinationId: destination.destinationId }),
          }).then(async (response) => {
            if (!response.ok) {
              const err = (await response.json()) as ErrorResult;
              throw new Error(err.message);
            }
          }),
          {
            optimisticUpdate(data) {
              return data.filter((d) => d.destinationId !== destination.destinationId);
            },
            shouldRevalidateAfter: false,
          },
        );

        toast.style = Toast.Style.Success;
        toast.title = "Deleted destination";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not delete destination";
        toast.message = `${error}`;
      }
    }
  }

  return (
    <List navigationTitle="Destinations" isLoading={isLoading} searchBarAccessory={dropdown}>
      {!isLoading && !destinations.length ? (
        <List.EmptyView
          icon={Icon.Upload}
          title=""
          description="To create a backup it is required to set at least 1 provider."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Destination"
                target={<CreateDestination instance={instance} onCreate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        destinations.map((destination) => (
          <List.Item
            key={destination.destinationId}
            icon={Icon.Coin}
            title={destination.name}
            accessories={[{ tag: destination.provider }, { date: new Date(destination.createdAt) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Destination"
                  target={<CreateDestination instance={instance} onCreate={revalidate} />}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  style={Action.Style.Destructive}
                  onAction={() => deleteDestination(destination)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Dokploy's error echoes the whole rclone command line, secret key included - keep only rclone's
// own last log line, and only its tail, where the root cause of a wrapped Go error ends up.
function connectionFailureReason(message: string | undefined, secretAccessKey: string) {
  const line = message
    ?.split("\n")
    .map((part) => part.trim())
    .filter((part) => part && !part.includes("--s3-"))
    .pop();
  if (!line) return undefined;
  const reason = line
    .replace(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} [A-Z]+: /, "")
    .replaceAll(secretAccessKey, "****");
  return reason.length > 160 ? `…${reason.slice(-160).replace(/^\S*\s/, "")}` : reason;
}

export function CreateDestination({ onCreate, instance }: { onCreate: () => void; instance?: Instance }) {
  const activeToken = useToken();
  const { url, headers } = instance ? tokenForInstance(instance) : activeToken;
  const { pop } = useNavigation();
  interface FormValues {
    name: string;
    provider: string;
    accessKey: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
    endpoint: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Testing Connection", values.endpoint);
      try {
        const testConnectionResponse = await fetch(url + "destination.testConnection", {
          method: "POST",
          headers,
          body: JSON.stringify(values),
        });
        if (!testConnectionResponse.ok) {
          const err = (await testConnectionResponse.json().catch(() => undefined)) as ErrorResult | undefined;
          const reason = connectionFailureReason(err?.message, values.secretAccessKey);
          toast.style = Toast.Style.Failure;
          toast.title = "Connection Failed";
          const stillAdd = await confirmAlert({
            icon: Icon.Warning,
            title: "Connection Failed",
            message: `${reason ? `${reason}\n\n` : ""}Do you still want to add this Destination?`,
            primaryAction: {
              title: "Create",
            },
          });
          if (!stillAdd) return;
        }

        toast.style = Toast.Style.Animated;
        toast.title = "Creating Destination";
        const response = await fetch(url + "destination.create", {
          method: "POST",
          headers,
          body: JSON.stringify(values),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Created Destination";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Destination";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      provider: FormValidation.Required,
      accessKey: FormValidation.Required,
      secretAccessKey: FormValidation.Required,
      bucket: FormValidation.Required,
      region: FormValidation.Required,
      endpoint: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Destinations"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="S3 Bucket" {...itemProps.name} />
      <Form.Dropdown title="Provider" {...itemProps.provider}>
        {Object.entries(DESTINATION_PROVIDERS).map(([key, title]) => (
          <Form.Dropdown.Item key={key} title={title} value={key} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Access Key Id" placeholder="xcas41dasde" {...itemProps.accessKey} />
      <Form.TextField title="Secret Access Key" placeholder="asd123asdasw" {...itemProps.secretAccessKey} />
      <Form.TextField title="Bucket" placeholder="dokploy-bucket" {...itemProps.bucket} />
      <Form.TextField title="Region" placeholder="us-east-1" {...itemProps.region} />
      <Form.TextField title="Endpoint" placeholder="https://us.bucket.aws/s3" {...itemProps.endpoint} />
    </Form>
  );
}
