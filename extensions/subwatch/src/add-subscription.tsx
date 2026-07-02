import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { fetchSubscriptions } from "./state";
import { NewSubscription } from "./types";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

export default function Command() {
  const { pop } = useNavigation();
  const { subwatchApiKey } = getPreferenceValues<Preferences>();
  const { isLoading, error, mutate, revalidate } = fetchSubscriptions();

  if (error) {
    showFailureToast(error, { title: "An error occurred!" });
  }

  async function handleCreate(subscription: NewSubscription) {
    await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${subscription.name}`,
    });

    const formatedSubscription: Record<string, string | number | Date | null> = subscription;

    if (subscription.start_date) {
      formatedSubscription.start_date = subscription.start_date.toISOString().split("T")[0];
    } else {
      delete formatedSubscription.start_date;
    }
    if (subscription.end_date) {
      formatedSubscription.end_date = subscription.end_date.toISOString().split("T")[0];
    } else {
      delete formatedSubscription.end_date;
    }
    if (subscription.trial_end_date) {
      formatedSubscription.trial_end_date = subscription.trial_end_date.toISOString().split("T")[0];
    } else {
      delete formatedSubscription.trial_end_date;
    }

    try {
      await mutate(
        fetch("https://subwatch.co/api/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": subwatchApiKey,
          },
          body: JSON.stringify(formatedSubscription),
        }),
      );
      revalidate();

      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${subscription.name} subscription created`,
      });
    } catch (err) {
      // The data will automatically be rolled back to its previous value.
      showFailureToast(err, { title: `Could not add ${subscription.name}` });
    }
  }

  const { handleSubmit, itemProps } = useForm<NewSubscription>({
    async onSubmit(values) {
      const cleanedDomain = values.domain.replace(/https?:\/\//gm, "").replace(/www\./gm, "");
      await handleCreate({ ...values, domain: cleanedDomain });
      pop();
    },
    validation: {
      name: FormValidation.Required,
      domain: FormValidation.Required,
      price: (value) => {
        if (!value) {
          return "The item is required";
        } else if (isNaN(Number(value))) {
          return "Price should be a number";
        } else if (Number(value) < 1) {
          return "Price should be a positive number";
        }
      },
      currency: FormValidation.Required,
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
      <Form.TextField title="Service" placeholder="apple" {...itemProps.name} />
      <Form.TextField title="Domain" placeholder="apple.com" {...itemProps.domain} />

      <Form.TextField title="Price" placeholder="$8" {...itemProps.price} />

      <Form.Dropdown title="Currency" {...itemProps.currency}>
        <Form.Dropdown.Item value="USD" title="USD" />
        <Form.Dropdown.Item value="EUR" title="EUR" />
        <Form.Dropdown.Item value="GBP" title="GBP" />
        <Form.Dropdown.Item value="JPY" title="JPY" />
        <Form.Dropdown.Item value="CAD" title="CAD" />
        <Form.Dropdown.Item value="AUD" title="AUD" />
        <Form.Dropdown.Item value="CHF" title="CHF" />
        <Form.Dropdown.Item value="CNY" title="CNY" />
        <Form.Dropdown.Item value="INR" title="INR" />
        <Form.Dropdown.Item value="BRL" title="BRL" />
        <Form.Dropdown.Item value="MXN" title="MXN" />
        <Form.Dropdown.Item value="KRW" title="KRW" />
        <Form.Dropdown.Item value="SGD" title="SGD" />
        <Form.Dropdown.Item value="HKD" title="HKD" />
        <Form.Dropdown.Item value="NOK" title="NOK" />
        <Form.Dropdown.Item value="SEK" title="SEK" />
        <Form.Dropdown.Item value="DKK" title="DKK" />
        <Form.Dropdown.Item value="NZD" title="NZD" />
        <Form.Dropdown.Item value="ILS" title="ILS" />
        <Form.Dropdown.Item value="AED" title="AED" />
        <Form.Dropdown.Item value="PLN" title="PLN" />
        <Form.Dropdown.Item value="CZK" title="CZK" />
      </Form.Dropdown>

      <Form.Dropdown title="Interval" {...itemProps.interval}>
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="one-time" title="One-time" />
      </Form.Dropdown>

      <Form.DatePicker title="Start Date" {...itemProps.start_date} />
      <Form.DatePicker title="End Date" {...itemProps.end_date} />
      <Form.DatePicker title="Trial End Date" {...itemProps.trial_end_date} />
    </Form>
  );
}
