import { Action, ActionPanel, Form } from "@raycast/api";
import { useMemo, useState } from "react";
import spacetime from "spacetime";

export type TimeEntry = {
  name: string;
  timezone: string;
  favorite: boolean;
  favoritePosition: number;
  profileImage?: string;
};

interface TimeEntryFormProps {
  entry?: TimeEntry;
  handleSubmit: (entry: TimeEntry) => void;
}

export function TimeEntryForm({ entry, handleSubmit }: TimeEntryFormProps) {
  const [nameError, setNameError] = useState<string | undefined>();

  function validateName(name: string) {
    if (name.length == 0) {
      setNameError("The field should't be empty!");
    } else if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  const timezonesByCountry = useMemo(() => {
    const timezones = Intl.supportedValuesOf("timeZone");
    return timezones.reduce((acc: Record<string, string[]>, tz) => {
      const [country] = tz.split("/");
      if (!acc[country]) {
        acc[country] = [];
      }
      acc[country].push(tz);
      return acc;
    }, {});
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={(changedValue) => {
              if (changedValue.name.length == 0) {
                setNameError("The field should't be empty!");
                return;
              }

              if (nameError && nameError.length > 0) {
                return;
              }

              handleSubmit({
                name: changedValue.name,
                timezone: changedValue.timezone,
                favorite: entry?.favorite ?? false,
                favoritePosition: entry?.favoritePosition ?? 0,
                // profileImage: changedValue?.profileImage[0],
              });
            }}
          />
        </ActionPanel>
      }
    >
      {/* <Form.FilePicker
        id="profileImage"
        title="Profile Image"
        info="If you move the image to a different location, you will need to reselect it."
        defaultValue={entry?.profileImage ? [entry?.profileImage] : []}
        allowMultipleSelection={false}
      /> */}
      <Form.TextField
        id="name"
        title="Name"
        error={nameError}
        onChange={(value) => {
          validateName(value);
        }}
        onBlur={(event) => {
          validateName(event.target.value ?? "");
        }}
        defaultValue={entry?.name}
      />
      <Form.Dropdown id="timezone" title="Timezone" defaultValue={entry?.timezone ?? "Europe/Amsterdam"}>
        {Object.keys(timezonesByCountry).map((country) => (
          <Form.Dropdown.Section key={country} title={country}>
            {timezonesByCountry[country].map((tz) => {
              const offset = spacetime.now(tz).timezone().current.offset;
              const offsetString = offset < 0 ? offset : `+${offset}`;
              const label = `${tz.replace(/_/g, " ")} (UTC/GMT${offsetString})`;
              return <Form.Dropdown.Item key={tz} value={tz} title={label} />;
            })}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
    </Form>
  );
}
