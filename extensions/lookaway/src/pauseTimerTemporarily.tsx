import { ActionPanel, Action, List, Form, useNavigation, Icon } from '@raycast/api';
import { useState } from 'react';
import { runLookAwayCommand } from './utils';

const pauseDurations = [
  { title: '10 minutes', value: 600 },
  { title: '15 minutes', value: 900 },
  { title: '30 minutes', value: 1800 },
  { title: '45 minutes', value: 2700 },
  { title: '1 hour', value: 3600 },
  { title: '2 hours', value: 7200 },
  { title: '4 hours', value: 14400 },
  { title: '8 hours', value: 28800 },
  { title: '24 hours', value: 86400 },
];

async function handlePause(duration: number) {
  await runLookAwayCommand('pause temporarily', 'paustemp', 'Paused work mode temporarily', duration);
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
      await handlePause(parseInt(values.duration, 10));
      pop(); // Close the form after successful execution
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pause Work Mode" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="duration"
        title="Duration (seconds)"
        placeholder="Enter pause duration in seconds"
        error={durationError}
        onChange={(newValue) => validateDuration(newValue)} // Validate on change
        onBlur={(event) => validateDuration(event.target.value)} // Also validate on blur
      />
    </Form>
  );
}

export default function Command() {
  return (
    <List navigationTitle="Pause Work Mode Temporarily">
      <List.Section title="Predefined Durations">
        {pauseDurations.map((duration) => (
          <List.Item
            key={duration.value}
            title={duration.title}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Pause" onAction={() => handlePause(duration.value)} />
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
