import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { fetchSubscriptions } from "./state";
import { NewSubscription } from "./types";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

export default function Command() {
  const { pop } = useNavigation();
  const { subwatchApiKey, supabaseApiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data, error, mutate, revalidate } = fetchSubscriptions();

  if (error) {
    showFailureToast(error, { title: "An error occurred!" });
  }

  async function handleCreate(subscription: NewSubscription) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${subscription.service}`,
    });
    try {
      if (!data?.[0]?.data) {
        throw new Error("No data available");
      }

      data?.[0].data.push({
        name: subscription.service,
        domain: subscription.domain,
        count: 0,
        billing: [
          {
            start_date: String(subscription.start_date.toISOString()),
            end_date: String(subscription.end_date),
            price: Number(subscription.price),
            interval: subscription.interval,
            count: 0,
          },
        ],
      });

      await mutate(
        fetch("https://nzyzephaenhlxoohrphc.supabase.co/rest/v1/rpc/raycast_update_data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseApiKey,
          },
          body: JSON.stringify({
            raycast_uuid: subwatchApiKey,
            newdata: data?.[0].data,
          }),
        }),
      );
      revalidate();

      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${subscription.service} subscription created`,
      });
    } catch (err) {
      // The data will automatically be rolled back to its previous value.
      showFailureToast(err, { title: `Could not add ${subscription.service}` });
    }
  }

  const { handleSubmit, itemProps } = useForm<NewSubscription>({
    async onSubmit(values) {
      const cleanedDomain = values.domain.replace(/https?:\/\//gm, "").replace(/www\./gm, "");
      handleCreate({ ...values, domain: cleanedDomain });
      pop();
    },
    validation: {
      service: FormValidation.Required,
      domain: FormValidation.Required,
      price: (value) => {
        if (!Number(value)) {
          return "Price should be a number";
        } else if (!value) {
          return "The item is required";
        } else if (Number(value) < 1) {
          return "Price should be a positive number";
        }
      },
      interval: FormValidation.Required,
      start_date: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.SubmitForm title="Create New Subscription" onSubmit={handleSubmit} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Track, alert, and optimize a new subscription" />
      <Form.TextField title="Service" placeholder="apple" {...itemProps.service} />
      <Form.TextField title="Domain" placeholder="apple.com" {...itemProps.domain} />

      <Form.TextField title="Price" placeholder="$8" {...itemProps.price} />

      <Form.Dropdown title="Interval" {...itemProps.interval}>
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
      </Form.Dropdown>

      <Form.DatePicker id="start_date" title="Start Date" />
      <Form.DatePicker id="end_date" title="End Date" />
    </Form>
  );
}
