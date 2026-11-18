import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { Subscription } from "../../types";
import { formatAmount, formatPerPerson, getPerPersonAmount, getSubscriptionTitle } from "../../utils";

/** A family plan is shared by at least 2 people, and few allow more than 20. */
const MIN_SEATS = 2;
const MAX_SEATS = 20;

interface FormValues {
  seats: string;
}

/** The number of seats, or `undefined` when `value` isn't a whole number from `MIN_SEATS` to `MAX_SEATS`. */
function parseSeats(value: string) {
  const seats = Number(value.trim());
  return value.trim() && Number.isInteger(seats) && seats >= MIN_SEATS && seats <= MAX_SEATS ? seats : undefined;
}

/**
 * Marks a subscription as family, or changes how many seats it has, so it shows what each person pays. Totals
 * still count the full price, which the card pays.
 */
export default function FamilySubscriptionForm(props: {
  subscription: Subscription;
  onSave: (subscription: Subscription, patch: { seats: number }) => Promise<void>;
}) {
  const { subscription, onSave } = props;
  const navigation = useNavigation();
  const title = getSubscriptionTitle(subscription);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: { seats: String(subscription.seats ?? MIN_SEATS) },
    validation: {
      seats: (value?: string) =>
        parseSeats(value ?? "") === undefined ? `Enter a whole number from ${MIN_SEATS} to ${MAX_SEATS}` : undefined,
    },
    async onSubmit(values) {
      try {
        const seats = parseSeats(values.seats)!;
        await onSave(subscription, { seats });
        navigation.pop();
        await showToast(
          Toast.Style.Success,
          "Family Subscription Saved",
          `${title}: ${formatPerPerson({ ...subscription, seats })}`,
        );
      } catch (error) {
        await showFailureToast(error, { title: "Failed to save family subscription" });
      }
    },
  });

  // Follows the field as the user types.
  const seats = parseSeats(values.seats);
  const perPerson = seats ? getPerPersonAmount({ ...subscription, seats }) : undefined;

  return (
    <Form
      navigationTitle={subscription.seats ? `Edit Family Seats of ${title}` : `Mark ${title} as Family`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Seats" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.seats}
        title="Seats"
        placeholder={String(MIN_SEATS)}
        info="How many people share it, including you. Totals still count the full price, which your card pays."
      />
      <Form.Description title="Total" text={formatAmount(subscription.amount, subscription.currency)} />
      <Form.Description
        title="Per Person"
        text={
          perPerson !== undefined
            ? `${formatAmount(perPerson, subscription.currency)} (${seats} seats)`
            : `Enter ${MIN_SEATS} to ${MAX_SEATS} seats`
        }
      />
    </Form>
  );
}
