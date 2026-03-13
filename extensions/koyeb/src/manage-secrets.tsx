import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { type CreateSecret, Secret, SecretType } from "./types";
import { API_URL, headers, parseResponse } from "./koyeb";

export default function ManageSecrets() {
  const {
    isLoading,
    data: secrets,
    error,
    revalidate,
    mutate,
  } = useFetch(API_URL + "secrets", {
    headers,
    parseResponse,
    mapResult(result: { secrets: Secret[] }) {
      return {
        data: result.secrets,
      };
    },
    initialData: [],
  });

  async function confirmAndRemove(secret: Secret) {
    const options: Alert.Options = {
      title: `Are you sure you want to delete the ${secret.name} secret?`,
      message: "This can not be undone.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete secret",
      },
    };
    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Removing", secret.name);
      try {
        await mutate(
          fetch(API_URL + `secrets/${secret.id}`, {
            method: "DELETE",
            headers,
          }).then(parseResponse),
          {
            optimisticUpdate(data) {
              return data.filter((s) => s.id !== secret.id);
            },
          },
        );
        toast.style = Toast.Style.Success;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    }
  }

  async function revealAndCopy(secret: Secret) {
    const toast = await showToast(Toast.Style.Animated, "Revealing", secret.name);
    try {
      const response = await fetch(API_URL + `secrets/${secret.id}/reveal`, {
        method: "POST",
        headers,
      });
      const result: { value: string } = await parseResponse(response);
      await mutate(undefined, {
        optimisticUpdate(data) {
          return data.map((s) => (s.id === secret.id ? { ...s, value: result.value } : s));
        },
        shouldRevalidateAfter: false,
      });
      toast.title = "Copying";
      await Clipboard.copy(result.value);
      toast.title = "Copied";
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !secrets.length && !error ? (
        <List.EmptyView
          title="You don't have any secrets yet"
          description="Secrets enable you to secure your code by removing hardcoded credentials and let you pass environment variables securely to your applications"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Secret" target={<CreateSecret />} onPop={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        secrets.map((secret) => (
          <List.Item
            key={secret.id}
            icon={Icon.Key}
            title={secret.name}
            subtitle={secret.value}
            accessories={[{ date: new Date(secret.updated_at) }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Create Secret" target={<CreateSecret />} onPop={revalidate} />
                <Action
                  icon={Icon.Trash}
                  title="Remove"
                  onAction={() => confirmAndRemove(secret)}
                  style={Action.Style.Destructive}
                />
                <Action
                  icon={Icon.CopyClipboard}
                  title="Copy to Clipboard"
                  onAction={() => revealAndCopy(secret)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateSecret() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateSecret>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating Secret", values.name);
      try {
        const response = await fetch(API_URL + "secrets", {
          method: "POST",
          headers,
          body: JSON.stringify({ ...values, type: SecretType.SIMPLE }),
        });
        await parseResponse(response);
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
      name: FormValidation.Required,
      value: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Secret" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="All Secret values are automatically encrypted server-side to ensure secure storage" />
      <Form.TextField title="Name" placeholder="e.g. api-key" {...itemProps.name} />
      <Form.PasswordField title="Value" {...itemProps.value} />
    </Form>
  );
}
