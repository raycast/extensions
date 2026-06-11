import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { DateTime } from "luxon";

function formatZoneLabel(tz: string): string {
  const dt = DateTime.now().setZone(tz);
  return `${tz} (${dt.toFormat("ZZZZ")})`;
}

const TIMEZONES = Intl.supportedValuesOf("timeZone");

type TimezoneFormProps = {
  readonly title: string;
  readonly onSubmit: (zone: string) => void;
};

export function TimezoneForm({ title, onSubmit }: TimezoneFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply"
            icon={Icon.Check}
            onSubmit={(values: { timezone: string }) => {
              onSubmit(values.timezone);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="timezone" title="Timezone" defaultValue="UTC">
        {TIMEZONES.map((tz) => (
          <Form.Dropdown.Item key={tz} value={tz} title={formatZoneLabel(tz)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
