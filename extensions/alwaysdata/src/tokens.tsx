import {
  List,
  Icon,
  ActionPanel,
  Color,
  Action,
  useNavigation,
  showToast,
  Toast,
  Form,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { alwaysdata } from "./alwaysdata";
import OpenInAlwaysdata from "./components/open-in-alwaysdata";

export default function Tokens() {
  const {
    isLoading,
    data: tokens,
    mutate,
  } = useCachedPromise(alwaysdata.tokens.list, [], {
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {tokens.map((token) => (
        <List.Item
          key={token.id}
          icon={Icon.Key}
          title={token.app_name}
          subtitle={token.key}
          accessories={[
            token.is_disabled
              ? { icon: Icon.PauseFilled, text: "Paused" }
              : { icon: { source: Icon.PlayFilled, tintColor: Color.Green }, text: "Active" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Generate Token" target={<GenerateToken />} onPop={mutate} />
              <Action.CopyToClipboard title="Copy Key to Clipboard" content={token.key} />
              <OpenInAlwaysdata path={`token/${token.id}`} />
              <Action
                icon={Icon.Trash}
                title="Delete Token"
                onAction={() => {
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: `Are you sure?`,
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", token.app_name);
                        try {
                          await mutate(alwaysdata.tokens.delete({ id: token.id }), {
                            optimisticUpdate(data) {
                              return data.filter((t) => t.id !== token.id);
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
                }}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GenerateToken() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ app_name: string; allowed_ips: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Generating", values.app_name);
      try {
        await alwaysdata.tokens.generate(values);
        toast.style = Toast.Style.Success;
        toast.title = "Generated";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      app_name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Generate Token" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Application" {...itemProps.app_name} />
      <Form.TextField
        title="Allowed IP addresses"
        info="List of IPv4 or IPv6 addresses or ranges allowed for this token, separated by a space. Examples: 192.0.2.42, 198.51.100.0/24, 2001:db8:1:2:3::4. All other addresses will be rejected."
        {...itemProps.allowed_ips}
      />
    </Form>
  );
}
