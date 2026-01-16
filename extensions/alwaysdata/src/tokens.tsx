import { List, Icon, ActionPanel, Color, Action, showToast, Toast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
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
