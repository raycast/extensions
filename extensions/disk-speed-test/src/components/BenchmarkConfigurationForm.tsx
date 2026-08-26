import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import {
  BENCHMARK_DATA_SIZE_OPTIONS,
  BENCHMARK_DURATION_OPTIONS,
  BenchmarkTarget,
  BenchmarkTargetValues,
  benchmarkTargetValues,
  parseBenchmarkTarget,
} from "../benchmark/targets";

interface BenchmarkConfigurationFormProps {
  target: BenchmarkTarget;
  onStart: (target: BenchmarkTarget) => Promise<void> | void;
}

export function BenchmarkConfigurationForm({ target, onStart }: BenchmarkConfigurationFormProps) {
  const { pop } = useNavigation();
  const initialValues = benchmarkTargetValues(target);

  async function submit(values: BenchmarkTargetValues) {
    await onStart(parseBenchmarkTarget(values));
    pop();
  }

  return (
    <Form
      navigationTitle="Configure Disk Speed Test"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Test" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose independent storage and time limits for this run. The benchmark stops at whichever limit it reaches first in each measured phase." />
      <Form.Dropdown id="maxTestSizeMiB" title="Maximum Test Data" defaultValue={initialValues.maxTestSizeMiB}>
        {BENCHMARK_DATA_SIZE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="targetDurationSeconds" title="Time Target" defaultValue={initialValues.targetDurationSeconds}>
        {BENCHMARK_DURATION_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
        ))}
      </Form.Dropdown>
      <Form.Description text="The time target applies separately to sequential write and read. Temporary data is always removed when the run ends." />
    </Form>
  );
}
