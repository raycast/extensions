import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import { Panel } from "./types";
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
import crypto from "crypto";
import Servers from "./servers";
import VirtFusion from "./virtfusion";
import SSHKeys from "./ssh-keys";

export default function ManagePanels() {
  const { isLoading, value: panels = [], setValue: setPanels } = useLocalStorage<Panel[]>("virtfusion-panels");
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
            icon="virtfusion.png"
            title={panel.title}
            subtitle={panel.virtfusion_url}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.HardDrive} title="Servers" target={<Servers panel={panel} />} />
                <Action.Push icon={Icon.Key} title="SSH Keys" target={<SSHKeys panel={panel} />} />
                <ActionPanel.Section>
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
                        message: panel.title || panel.virtfusion_url,
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
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddPanel() {
  const { value = [], setValue } = useLocalStorage<Panel[]>("virtfusion-panels");
  const { handleSubmit, itemProps } = useForm<Panel>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding panel", values.title || values.virtfusion_url);
      try {
        const vf = new VirtFusion(values);
        await vf.connect();
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
      virtfusion_url(value) {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch {
          return "Invalid URL";
        }
      },
      api_token: FormValidation.Required,
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
      <Form.TextField title="VirtFusion URL" placeholder="VirtFusion URL" {...itemProps.virtfusion_url} />
      <Form.PasswordField title="API Token" placeholder="API Token" {...itemProps.api_token} />
    </Form>
  );
}
