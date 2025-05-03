import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { getStuff } from "./state";
import { NewSubscription } from "./types";
import { FormValidation, useForm } from "@raycast/utils";

export default function Command() {
  const { pop } = useNavigation();
  const { subwatchApiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data, error, mutate, revalidate } = getStuff();

  if (error) {
    showToast({
      style: Toast.Style.Success,
      title: "An error occurred!",
      message: error.message,
    });
  }

  async function handleCreate(subscription: NewSubscription) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Adding ${subscription.service}` });
    try {
      data?.[0].data.push({
        name: subscription.service,
        domain: subscription.domain,
        count: 0,
        billing: [
          {
            start_date: String(subscription.startDate.toISOString()),
            end_date: String(subscription.endDate),
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
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXplcGhhZW5obHhvb2hycGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTQzMjgsImV4cCI6MjA1OTc3MDMyOH0.6AboCGgJGqJMTgqUH3LsYmhoWQ8sfEWqdv0cY-1EXIg",
          },
          body: JSON.stringify({ raycast_uuid: subwatchApiKey, newdata: data?.[0].data }),
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
      toast.style = Toast.Style.Failure;
      toast.title = `Could not add ${subscription.service}`;
      toast.message = err?.message;
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
        }
      },
      interval: FormValidation.Required,
      startDate: FormValidation.Required,
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

      <Form.DatePicker id="startDate" title="Start Date" />
      <Form.DatePicker id="endDate" title="End Date" />
    </Form>
  );
}
