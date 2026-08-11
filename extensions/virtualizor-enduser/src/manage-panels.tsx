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
import { Panel } from "./lib/types/panel";
import Logs from "./logs";
import VirtualServers from "./virtual-servers";
import Tasks from "./tasks";
import crypto from "crypto";
import { handleParseResponse } from "./lib/hooks";

export default function ManagePanels() {
  const { isLoading, value: panels = [], setValue: setPanels } = useLocalStorage<Panel[]>("virtualizor-panels");
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
            icon="virtualizor.png"
            title={panel.title}
            subtitle={panel.virtualizor_url}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.HardDrive} title="Virtual Servers" target={<VirtualServers panel={panel} />} />
                <Action.Push icon={Icon.Text} title="Logs" target={<Logs panel={panel} />} />
                <Action.Push icon={Icon.CheckList} title="Tasks" target={<Tasks panel={panel} />} />
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
                      message: panel.title || panel.virtualizor_url,
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
  const { value = [], setValue } = useLocalStorage<Panel[]>("virtualizor-panels");
  const { handleSubmit, itemProps } = useForm<Panel>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding panel", values.title || values.virtualizor_url);
      try {
        const params = new URLSearchParams({
          act: "listvs",
          api: "json",
          apikey: values.api_key,
          apipass: values.api_pass,
        });
        const url = new URL(`index.php?${params}`, values.virtualizor_url);
        const response = await fetch(url);
        await handleParseResponse(response);
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
      virtualizor_url(value) {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch {
          return "Invalid URL";
        }
      },
      api_key: FormValidation.Required,
      api_pass: FormValidation.Required,
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
      <Form.TextField title="Virtualizor URL" placeholder="Virtualizor URL" {...itemProps.virtualizor_url} />
      <Form.PasswordField title="API Key" placeholder="API Key" {...itemProps.api_key} />
      <Form.PasswordField title="API Pass" placeholder="API Pass" {...itemProps.api_pass} />
    </Form>
  );
}
