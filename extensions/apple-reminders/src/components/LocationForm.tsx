import crypto from "crypto";

import { ActionPanel, Action, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { Location, LocationIcon, resolveLocationIcon } from "../hooks/useLocations";

type LocationFormValues = Omit<Location, "id">;

type SetLocationReminderFormProps = {
  onSubmit: (value: Location) => Promise<void>;
  location?: Location;
  isCustomLocation?: boolean;
};

export default function LocationForm({ onSubmit, location, isCustomLocation }: SetLocationReminderFormProps) {
  const { pop } = useNavigation();

  const locationIconOptions: { value: LocationIcon; title: string }[] = [
    { value: "home", title: "Home" },
    { value: "work", title: "Work" },
    { value: "gym", title: "Gym" },
    { value: "store", title: "Store" },
    { value: "school", title: "School" },
    { value: "other", title: "Other" },
  ];

  const defaultIcon: LocationIcon =
    locationIconOptions.find((option) => option.value === location?.icon)?.value ?? "home";

  const { itemProps, values, handleSubmit } = useForm<LocationFormValues>({
    async onSubmit(values) {
      const icon = (values.icon as LocationIcon) ?? "home";
      location
        ? await onSubmit({ ...location, ...values, icon })
        : await onSubmit({ ...values, icon, id: crypto.randomUUID() });
      pop();
    },
    initialValues: {
      name: location?.name,
      icon: defaultIcon,
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
            {locationIconOptions.map((option) => (
              <Form.Dropdown.Item
                key={option.value}
                title={option.title}
                value={option.value}
                icon={resolveLocationIcon(option.value)}
              />
            ))}
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
