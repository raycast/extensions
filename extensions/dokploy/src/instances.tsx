import { Action, ActionPanel, Form, Icon, Keyboard, List, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, useCachedState, useForm, useLocalStorage } from "@raycast/utils";
import Projects from "./projects";
import Docker from "./docker";
import Users from "./users";
import Destinations from "./destinations";

interface Instance {
  key: string;
  url: string;
  name: string;
}
interface CachedToken {
  url: string;
  headers: Record<string, string>;
}
export function useToken() {
  const [token] = useCachedState<CachedToken>("token", { url: "", headers: {} });
  return token;
}
export default function Instances() {
  const [, setToken] = useCachedState<CachedToken>("token");

  const { isLoading, value: instances = [] } = useLocalStorage<Instance[]>("instances");

  function onSelectionChange(key: string | null) {
    if (!key) return;
    const token = instances.find((i) => i.key === key);
    if (!token) return;
    const url = new URL("api/", token.url).toString();
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": token.key,
    };
    setToken({ url, headers });
  }

  return (
    <List onSelectionChange={onSelectionChange}>
      {!isLoading && !instances.length ? (
        <List.EmptyView
          icon="extension-icon.png"
          description="Add an instance to get started"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Instance" target={<AddInstance />} />
            </ActionPanel>
          }
        />
      ) : (
        instances.map((instance) => (
          <List.Item
            key={instance.key}
            id={instance.key}
            icon={Icon.Key}
            title={instance.name}
            subtitle={instance.url}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Folder} title="Projects" target={<Projects />} />
                <Action.Push icon="blocks.svg" title="Docker" target={<Docker />} />
                <ActionPanel.Section title="Settings">
                  <Action.Push icon={Icon.Coin} title="S3 Destinations" target={<Destinations />} />
                  <Action.Push icon={Icon.TwoPeople} title="Users" target={<Users />} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Instance"
                    target={<AddInstance />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddInstance() {
  const { value = [], setValue } = useLocalStorage<Instance[]>("instances");
  const { handleSubmit, itemProps } = useForm<Instance>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
      try {
        const res = await fetch(new URL("api/user.all", values.url).toString(), {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": values.key,
          },
        });
        if (!res.ok) throw new Error(res.statusText);
        await setValue([...value, values]);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not add";
        toast.message = `${error}`;
      }
    },
    validation: {
      key: FormValidation.Required,
      url(value) {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch {
          return "The item must be a valid URL";
        }
      },
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Verify & Add" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="Dokploy Instance"
        info="This is used to differentiate"
        {...itemProps.name}
      />
      <Form.TextField
        title="Instance URL"
        placeholder="https://dokploy.example.com/"
        info="Enter the full URL with port"
        {...itemProps.url}
      />
      <Form.PasswordField title="API Key" placeholder="Xx...XXX" {...itemProps.key} />
    </Form>
  );
}
