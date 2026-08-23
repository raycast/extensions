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
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { Panel } from "./types/panel";
import crypto from "crypto";
import Domains from "./domains";

export default function ManagePanels() {
  const { isLoading, value: panels = [], setValue: setPanels } = useLocalStorage<Panel[]>("directadmin-panels");
  return (
    <List isLoading={isLoading}>
      {!isLoading && !panels.length ? (
        <List.EmptyView
          title="No panels"
          description="Add a panel to get started"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Panel" target={<AddPanel />} />
            </ActionPanel>
          }
        />
      ) : (
        panels.map((panel) => (
          <List.Item
            key={panel.id}
            icon="directadmin-reseller.png"
            title={panel.title}
            subtitle={panel.directadmin_url}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Globe} title="Domains" target={<Domains panel={panel} />} />
                {/* <Action.Push icon={Icon.Text} title="Logs" target={<Logs panel={panel} />} />
                <Action.Push icon={Icon.CheckList} title="Tasks" target={<Tasks panel={panel} />} /> */}
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Panel"
                  target={<AddPanel />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Remove Panel"
                  onAction={() =>
                    confirmAlert({
                      icon: { source: Icon.Trash, tintColor: Color.Red },
                      title: "Remove Panel?",
                      message: panel.title || panel.directadmin_url,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Remove",
                        async onAction() {
                          await setPanels(panels.filter((p) => p.id !== panel.id));
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
        ))
      )}
    </List>
  );
}

function AddPanel() {
  const { value = [], setValue } = useLocalStorage<Panel[]>("directadmin-panels");
  const { handleSubmit, itemProps } = useForm<Panel>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding panel", values.title || values.directadmin_url);
      try {
        const token = btoa(`${values.reseller_username}:${values.reseller_password}`);
        const headers = {
          Authorization: `Basic ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        };
        const url = new URL("api/login-history", values.directadmin_url);
        const response = await fetch(url, {
          headers,
        });
        if (!response.ok) throw new Error(response.statusText);
        await setValue([...value, { ...values, id: crypto.randomUUID() }]);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      directadmin_url(value) {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch {
          return "Invalid URL";
        }
      },
      reseller_username: FormValidation.Required,
      reseller_password: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Panel" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Title" {...itemProps.title} />
      <Form.TextField title="DirectAdmin URL" placeholder="DirectAdmin URL" {...itemProps.directadmin_url} />
      <Form.TextField title="Reseller Username" placeholder="Reseller Username" {...itemProps.reseller_username} />
      <Form.PasswordField title="Reseller Password" placeholder="Reseller Password" {...itemProps.reseller_password} />
    </Form>
  );
}
