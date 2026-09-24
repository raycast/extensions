import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm, useLocalStorage } from "@raycast/utils";
import Projects from "./projects";
import Docker from "./docker";
import Users from "./users";
import Destinations from "./destinations";

export interface Instance {
  /** Absent on instances stored before Edit/Delete existed - never backfilled in bulk, see `instanceId`. */
  id?: string;
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
/** Builds the same `{ url, headers }` request token `useToken()` caches, for any stored instance. */
export function tokenForInstance(instance: Instance): CachedToken {
  return {
    url: new URL("api/", instance.url).toString(),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": instance.key,
    },
  };
}
/** `key` (the API secret) is the only identifier instances stored before this had - fall back to it. */
function instanceId(instance: Instance): string {
  return instance.id ?? instance.key;
}
/** Whether `token` (the cached active connection) is currently pointed at `instance`. */
function isActiveInstance(instance: Instance, token: CachedToken): boolean {
  return (
    !!token.headers["x-api-key"] &&
    token.headers["x-api-key"] === instance.key &&
    token.url === tokenForInstance(instance).url
  );
}
export default function Instances() {
  const [token, setToken] = useCachedState<CachedToken>("token", { url: "", headers: {} });
  const { pop } = useNavigation();

  const { isLoading, value: instances = [], setValue } = useLocalStorage<Instance[]>("instances");

  function onSelectionChange(key: string | null) {
    if (!key) return;
    const instance = instances.find((i) => instanceId(i) === key);
    if (!instance) return;
    setToken(tokenForInstance(instance));
  }

  async function deleteInstance(instance: Instance) {
    const wasActive = isActiveInstance(instance, token);
    const options: Alert.Options = {
      title: "Delete Instance",
      message: `This removes "${instance.name}" from Raycast only - it doesn't revoke the API key or change anything on the Dokploy server. You'll need to re-enter the URL and API key to reconnect.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (await confirmAlert(options)) {
      // Reference equality, not `instanceId()` - two records that predate `id` and happen to share
      // a `key` (nothing stops that on Add) would otherwise both match the same fallback identity
      // and both get removed. `instance` is the exact array element this row was rendered from, so
      // this always targets only the one actually being deleted, duplicate keys or not.
      const remaining = instances.filter((i) => i !== instance);
      await setValue(remaining);
      // Every other screen (Projects, Docker, ...) fetches unconditionally off `useToken()`'s
      // url with no guard for it being empty, so leaving the cached token at its blank default
      // whenever another instance is still around would crash the next screen instead of
      // degrading gracefully - auto-switch to one of the survivors instead.
      if (wasActive) setToken(remaining.length ? tokenForInstance(remaining[0]) : { url: "", headers: {} });
      await showToast(Toast.Style.Success, "Deleted", instance.name);
    }
  }

  return (
    <List onSelectionChange={onSelectionChange}>
      {!isLoading && !instances.length ? (
        <List.EmptyView
          icon="extension-icon.png"
          description="Add an instance to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Instance"
                target={<InstanceForm instances={instances} setInstances={setValue} onSaved={pop} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        instances.map((instance) => (
          <List.Item
            key={instanceId(instance)}
            id={instanceId(instance)}
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
                    target={<InstanceForm instances={instances} setInstances={setValue} onSaved={pop} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit Instance"
                    target={
                      <InstanceForm initial={instance} instances={instances} setInstances={setValue} onSaved={pop} />
                    }
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    icon={Icon.Trash}
                    title="Delete Instance"
                    style={Action.Style.Destructive}
                    onAction={() => deleteInstance(instance)}
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

function InstanceForm({
  initial,
  instances,
  setInstances,
  onSaved,
}: {
  initial?: Instance;
  /**
   * Owned by whichever caller rendered this form - `useLocalStorage` has no cache shared across
   * separate call sites (unlike `useCachedState`, which is why `token` syncs fine on its own), so
   * this form must never keep its own independent copy: saving there wouldn't reach a caller's
   * already-mounted list, leaving it showing the pre-edit row until it happened to remount.
   */
  instances: Instance[];
  setInstances: (instances: Instance[]) => Promise<void>;
  /** How to leave the form once saved - `pop()` back to a caller with live state, or `popToRoot()` for a caller (like `AddInstance`'s standalone use) with no shared state to reveal fresh. */
  onSaved: () => void | Promise<void>;
}) {
  const [token, setToken] = useCachedState<CachedToken>("token", { url: "", headers: {} });

  const { handleSubmit, itemProps } = useForm<Pick<Instance, "name" | "url" | "key">>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, initial ? "Saving" : "Adding", values.name);
      try {
        const res = await fetch(new URL("api/user.all", values.url).toString(), {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": values.key,
          },
        });
        if (!res.ok) throw new Error(res.statusText);

        const record: Instance = { ...values, id: initial?.id ?? crypto.randomUUID() };
        const wasActive = !!initial && isActiveInstance(initial, token);
        // Reference equality, same reasoning as `deleteInstance` - `initial` is the exact array
        // element being edited, so this can't be fooled by a duplicate `key` matching more than
        // one pre-`id` record via `instanceId()`.
        const next = initial ? instances.map((i) => (i === initial ? record : i)) : [...instances, record];
        await setInstances(next);
        if (wasActive) setToken(tokenForInstance(record));

        toast.style = Toast.Style.Success;
        toast.title = initial ? "Saved" : "Added";
        await onSaved();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = initial ? "Could not save" : "Could not add";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: initial?.name ?? "",
      url: initial?.url ?? "",
      key: initial?.key ?? "",
    },
    validation: {
      key(value) {
        if (!value) return "The item is required";
        // Reference equality (not `instanceId()`) already makes Edit/Delete immune to two stored
        // instances sharing a key, but a duplicate is still meaningless (an API key identifies one
        // org's access, not two separate ones) and would make `isActiveInstance` treat both as
        // active together - block it going forward rather than just tolerate it. Only when the key
        // is actually changing, though - otherwise editing just the name/URL of one half of an
        // already-duplicate pair (from before this check existed) would be permanently stuck.
        if (value !== initial?.key && instances.some((i) => i.key === value)) {
          return "Another instance already uses this API key";
        }
      },
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
      navigationTitle={initial ? "Edit Instance" : "Add Instance"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={initial ? Icon.Check : Icon.Plus}
            title={initial ? "Save Instance" : "Verify & Add"}
            onSubmit={handleSubmit}
          />
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

export function AddInstance() {
  const { value = [], setValue } = useLocalStorage<Instance[]>("instances");
  return <InstanceForm instances={value} setInstances={setValue} onSaved={popToRoot} />;
}
