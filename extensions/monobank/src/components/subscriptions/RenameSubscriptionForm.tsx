import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Subscription } from "../../types";
import { getSubscriptionTitle } from "../../utils";

interface FormValues {
  name: string;
}

/** Renames a subscription. An empty name brings back the merchant's own. */
export default function RenameSubscriptionForm(props: {
  subscription: Subscription;
  onRename: (subscription: Subscription, patch: { name: string }) => Promise<void>;
}) {
  const { subscription, onRename } = props;
  const navigation = useNavigation();

  async function onSubmit(values: FormValues) {
    try {
      // The merchant's own name isn't saved, so the subscription follows it if it changes.
      const name = values.name.trim() === subscription.name ? "" : values.name;
      await onRename(subscription, { name });
      navigation.pop();
      await showToast(Toast.Style.Success, "Subscription Renamed");
    } catch (error) {
      await showFailureToast(error, { title: "Failed to rename subscription" });
    }
  }

  return (
    <Form
      navigationTitle={`Rename ${getSubscriptionTitle(subscription)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder={subscription.name}
        info="Leave empty to use the merchant's name from the statement."
        defaultValue={subscription.customName ?? subscription.name}
      />
    </Form>
  );
}
