import { ActionPanel, Action, List, Form, useNavigation, Icon } from '@raycast/api';
import { useState } from 'react';
import { runLookAwayCommand } from './utils';

const postponeDurations = [
  { title: '1 minute', value: 60 },
  { title: '5 minutes', value: 300 },
];

async function handlePostpone(duration: number) {
  await runLookAwayCommand('postpone break', 'pstpnbrk', 'Postponed break', duration);
}

function CustomDurationForm() {
  const { pop } = useNavigation();
  const [durationError, setDurationError] = useState<string | undefined>();

  function validateDuration(value?: string) {
    if (!value) {
      setDurationError('Duration cannot be empty');
      return false;
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
      setDurationError('Please enter a positive number of seconds');
      return false;
    }
    setDurationError(undefined);
    return true;
  }

  async function handleSubmit(values: { duration: string }) {
    if (validateDuration(values.duration)) {
      await handlePostpone(parseInt(values.duration, 10));
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Postpone Break" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="duration"
        title="Duration (seconds)"
        placeholder="Enter postpone duration in seconds"
        error={durationError}
        onChange={(newValue) => validateDuration(newValue)}
        onBlur={(event) => validateDuration(event.target.value)}
      />
    </Form>
  );
}

export default function Command() {
  return (
    <List navigationTitle="Postpone Break">
      <List.Section title="Predefined Durations">
        {postponeDurations.map((duration) => (
          <List.Item
            key={duration.value}
            title={duration.title}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Postpone" onAction={() => handlePostpone(duration.value)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Custom">
        <List.Item
          title="Custom Duration..."
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action.Push title="Set Custom Duration" target={<CustomDurationForm />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
