import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { setLocation } from "swift:../../swift/AppleReminders";

import { getLocationDescription } from "../helpers";
import { List, Reminder } from "../hooks/useData";

type EditReminderProps = {
  reminder: Reminder;
  mutate: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export default function AddLocation({ reminder, mutate }: EditReminderProps) {
  const { pop } = useNavigation();

  const { itemProps, values, handleSubmit } = useForm<{ address: string; proximity: string; radius: string }>({
    async onSubmit({ address, proximity, radius }) {
      try {
        const numberRadius = parseInt(radius);
        await mutate(setLocation({ reminderId: reminder.id, address, proximity, radius: numberRadius }));
        await showToast({
          style: Toast.Style.Success,
          title: `Set location reminder`,
          message: getLocationDescription({ address, proximity, radius: numberRadius }),
        });

        pop();
      } catch (error) {
        console.log(error);
        await showToast({
          style: Toast.Style.Failure,
          title: `Unable to add location reminder`,
        });
      }
    },
    initialValues: {
      address: reminder.location?.address ?? "",
      proximity: reminder.location?.proximity,
    },
    validation: {
      address: FormValidation.Required,
      radius: (value) => {
        if (!values.address) return;
        if (isNaN(Number(value))) return "Interval must be a number";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Location" onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.address} title="Location" placeholder="Address" />

      <Form.Dropdown
        {...itemProps.proximity}
        title="Proximity"
        info="Whether you want to trigger the reminder when arriving at the place or when leaving it"
      >
        <Form.Dropdown.Item title="Arriving" value="enter" />
        <Form.Dropdown.Item title="Leaving" value="leave" />
      </Form.Dropdown>
      <Form.TextField
        {...itemProps.radius}
        title="Radius"
        placeholder="100"
        info="The minimum distance in meters from the place that would trigger the reminder"
      />
    </Form>
  );
}
