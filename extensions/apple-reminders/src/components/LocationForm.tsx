import crypto from "crypto";

import { ActionPanel, Action, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { uniqBy } from "lodash";
import { useMemo } from "react";

import { Location } from "../hooks/useLocations";

type LocationFormValues = Omit<Location, "id">;

type SetLocationReminderFormProps = {
  onSubmit: (value: Location) => Promise<void>;
  location?: Location;
  isCustomLocation?: boolean;
};

export default function LocationForm({ onSubmit, location, isCustomLocation }: SetLocationReminderFormProps) {
  const { pop } = useNavigation();

  const { itemProps, values, handleSubmit } = useForm<LocationFormValues>({
    async onSubmit(values) {
      location ? await onSubmit({ ...location, ...values }) : await onSubmit({ ...values, id: crypto.randomUUID() });
      pop();
    },
    initialValues: {
      name: location?.name,
      icon: location?.icon,
      address: location?.address,
      proximity: location?.proximity,
      radius: location?.radius,
    },
    validation: {
      name: (value) => {
        if (isCustomLocation) return;
        if (!value) return "Name is required";
      },
      address: FormValidation.Required,
      radius: (value) => {
        if (!values.address) return;
        if (isNaN(Number(value))) return "Radius must be a number";
      },
    },
  });

  // There seems to be a bug in the Icon type, so we need to filter out the duplicates
  const icons = useMemo(
    () =>
      uniqBy(Object.entries(Icon), (value) => {
        return value[1];
      }),
    [],
  );

  let title;
  if (isCustomLocation) {
    title = "Add Location";
  } else if (location) {
    title = "Edit Location";
  } else {
    title = "Add Saved Location";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Plus} title={title} />
        </ActionPanel>
      }
      navigationTitle={title}
    >
      {!isCustomLocation ? (
        <>
          <Form.TextField {...itemProps.name} title="Name" placeholder="Enter a name" />
          <Form.Dropdown {...itemProps.icon} title="Icon">
            {icons.map(([key, value]) => {
              return <Form.Dropdown.Item key={key} title={key} value={value} icon={value} />;
            })}
          </Form.Dropdown>
        </>
      ) : null}
      <Form.TextField {...itemProps.address} title="Address" placeholder="Enter an address" />
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
