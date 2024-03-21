import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { ActionDebugJson } from "./components/ActionDebugJson";
import { ActionOpenInBrowser } from "./components/ActionOpenInBrowser";
import { ActionUnsubscribe } from "./components/ActionUnsubscribe";
import { EntryList } from "./components/EntryList";
import {
  FeedbinApiContextProvider,
  useFeedbinApiContext,
} from "./utils/FeedbinApiContext";
import { Subscription, updateSubscription } from "./utils/api";
import { getIcon } from "./utils/getIcon";

export function SubscriptionItem(props: { sub: Subscription }) {
  const icon = getIcon(props.sub.site_url);

  return (
    <List.Item
      key={props.sub.id}
      title={props.sub.title}
      icon={icon}
      subtitle={props.sub.site_url}
      keywords={[props.sub.site_url]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Feed"
            icon={Icon.List}
            target={
              <FeedbinApiContextProvider feedId={props.sub.feed_id}>
                <EntryList navigationTitle={props.sub.title} />
              </FeedbinApiContextProvider>
            }
          />
          <ActionOpenInBrowser url={props.sub.site_url} />
          <Action.Push
            title="Edit"
            icon={Icon.Pencil}
            shortcut={{
              key: "e",
              modifiers: ["cmd"],
            }}
            target={
              <FeedbinApiContextProvider parentContext={useFeedbinApiContext()}>
                <RenameSubscription sub={props.sub} />
              </FeedbinApiContextProvider>
            }
          />
          <Action.CopyToClipboard
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "c",
            }}
            icon={Icon.CopyClipboard}
            title="Copy Site URL"
            content={props.sub.site_url}
          />
          <Action.CopyToClipboard
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: ",",
            }}
            icon={Icon.CopyClipboard}
            title="Copy Feed URL"
            content={props.sub.feed_url}
          />
          <ActionUnsubscribe feedId={props.sub.feed_id} />
          <ActionDebugJson data={props.sub} />
        </ActionPanel>
      }
    />
  );
}

export function SubscriptionsCommand(): JSX.Element {
  const { subscriptions } = useFeedbinApiContext();

  return (
    <List isLoading={subscriptions.isLoading}>
      {subscriptions.data?.map((sub) => (
        <SubscriptionItem key={sub.feed_id} sub={sub} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <FeedbinApiContextProvider>
      <SubscriptionsCommand />
    </FeedbinApiContextProvider>
  );
}

function RenameSubscription(props: { sub: Subscription }) {
  const { subscriptions } = useFeedbinApiContext();
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async ({ title }) => {
              try {
                showToast(Toast.Style.Animated, "Saving...");
                await subscriptions.mutate(
                  updateSubscription(props.sub.id, title),
                  {
                    optimisticUpdate: (subs) =>
                      subs?.map((sub) =>
                        sub.id === props.sub.id ? { ...sub, title } : sub,
                      ),
                  },
                );
                pop();
                showToast(Toast.Style.Success, "Subscription updated");
              } catch (error) {
                showToast(Toast.Style.Failure, "Failed to update subscription");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" id="title" defaultValue={props.sub.title} />
    </Form>
  );
}
