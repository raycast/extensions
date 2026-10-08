import { Action, ActionPanel, Form, showHUD } from "@raycast/api";
import { clearStatus, setStatus } from "./api/status";
import { useState } from "react";
import { DateTime } from "luxon";
import { Presence, presences } from "./setPresence";
import { Availability, setAvailability } from "./api/presence";
import { catchAndToastError } from "./api/util";

const presenceItems: Presence[] = [{ label: "Don't change" }, ...presences.filter((p) => p.availability)];

const dateTimeFormat: Intl.DateTimeFormatOptions = {
  dateStyle: "full",
  timeStyle: "short",
  hourCycle: "h24",
};

interface FormValues {
  availability?: Availability;
  message: string;
  pinned: boolean;
  expiry: Date | null;
}

function PresenceDropdownItem({ presence }: { presence: Presence }) {
  return <Form.Dropdown.Item title={presence.label} value={presence.availability ?? ""} icon={presence.icon} />;
}

export default function SetStatus() {
  const [message, setMessage] = useState("");
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [expireAtEndOfDay, setExpireAtEndOfDay] = useState(false);
  const expiryDateTime = expiry
    ? expireAtEndOfDay
      ? DateTime.fromJSDate(expiry).endOf("day").toJSDate()
      : expiry
    : null;
  const expiresMsg = expiryDateTime
    ? `Clear status message on ${expiryDateTime.toLocaleString("en-US", dateTimeFormat)}`
    : "Never clear status message";
  const updateStatus = async (values: FormValues) => {
    await catchAndToastError(async () => {
      if (values.availability) {
        await setAvailability(values.availability);
      }
      await setStatus(values.message, values.pinned, expiryDateTime);
      return true;
    }, false);
  };
  const resetStatus = async () =>
    catchAndToastError(async () => {
      await clearStatus();
      await showHUD("Cleared status");
    });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Status" onSubmit={updateStatus} />
          <Action title="Clear Status" onAction={resetStatus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="availability" title="Presence" storeValue>
        {presenceItems.map((presence) => (
          <PresenceDropdownItem key={presence.availability ?? ""} presence={presence} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Your status message"
        storeValue
        onChange={setMessage}
        error={message.length > 280 ? `${message.length} of 280 allowed characters` : undefined}
      />
      <Form.Checkbox
        id="pinned"
        label="Show when people message me"
        info="Your status message will show above the compose message box when someone sends you a message or @mentions you."
        storeValue
      />
      <Form.DatePicker
        id="expiry"
        title="Expiry"
        type={Form.DatePicker.Type.DateTime}
        storeValue
        onChange={setExpiry}
        error={
          expiryDateTime && expiryDateTime.getTime() < new Date().getTime()
            ? "The expiration date must be in the future"
            : undefined
        }
      />
      <Form.Checkbox
        id="expireAtEndOfDay"
        label="Expire at end of selected day"
        storeValue
        onChange={setExpireAtEndOfDay}
      />
      <Form.Description text={expiresMsg} />
    </Form>
  );
}
