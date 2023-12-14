import { Action, ActionPanel, Form } from "@raycast/api";
import { useMemo } from "react";
import spacetime from "spacetime";

export type TimeEntry = {
  name: string;
  timezone: string;
  favorite: boolean;
  favoritePosition: number;
};

interface TimeEntryFormProps {
  entry?: TimeEntry;
  errors?: Record<string, string>;
  handleSubmit: (entry: TimeEntry) => void;
}

export function TimeEntryForm({ entry, errors, handleSubmit }: TimeEntryFormProps) {
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
              handleSubmit({
                name: changedValue.name,
                timezone: changedValue.timezone,
                favorite: entry?.favorite ?? false,
                favoritePosition: entry?.favoritePosition ?? 0,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" error={errors?.name} defaultValue={entry?.name} />
      <Form.Dropdown
        id="timezone"
        title="Timezone"
        error={errors?.timezone}
        defaultValue={entry?.timezone ?? "Europe/Amsterdam"}
      >
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
