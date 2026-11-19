import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import {
  BENCHMARK_DATA_SIZE_OPTIONS,
  BENCHMARK_DURATION_OPTIONS,
  BenchmarkTarget,
  benchmarkTargetValues,
  parseBenchmarkTarget,
} from "../benchmark/targets";

interface BenchmarkTargetPickerProps {
  target: BenchmarkTarget;
  onChange: (target: BenchmarkTarget) => Promise<void> | void;
}

export function BenchmarkDataSizePicker({ target, onChange }: BenchmarkTargetPickerProps) {
  const values = benchmarkTargetValues(target);

  return (
    <TargetPicker
      navigationTitle="Maximum Test Data"
      searchBarPlaceholder="Choose Maximum Test Data"
      sectionTitle="Temporary File Limit"
      sectionSubtitle="The test may stop earlier when it reaches the time target"
      currentValue={values.maxTestSizeMiB}
      options={BENCHMARK_DATA_SIZE_OPTIONS}
      onSelect={(maxTestSizeMiB) => onChange(parseBenchmarkTarget({ ...values, maxTestSizeMiB }))}
    />
  );
}

export function BenchmarkDurationPicker({ target, onChange }: BenchmarkTargetPickerProps) {
  const values = benchmarkTargetValues(target);

  return (
    <TargetPicker
      navigationTitle="Time Target"
      searchBarPlaceholder="Choose Time Target"
      sectionTitle="Per Measured Phase"
      sectionSubtitle="Applied separately to sequential write and read"
      currentValue={values.targetDurationSeconds}
      options={BENCHMARK_DURATION_OPTIONS}
      onSelect={(targetDurationSeconds) => onChange(parseBenchmarkTarget({ ...values, targetDurationSeconds }))}
    />
  );
}

interface TargetPickerProps {
  navigationTitle: string;
  searchBarPlaceholder: string;
  sectionTitle: string;
  sectionSubtitle: string;
  currentValue: string;
  options: ReadonlyArray<{ title: string; value: string }>;
  onSelect: (value: string) => Promise<void> | void;
}

function TargetPicker({
  navigationTitle,
  searchBarPlaceholder,
  sectionTitle,
  sectionSubtitle,
  currentValue,
  options,
  onSelect,
}: TargetPickerProps) {
  const { pop } = useNavigation();

  async function select(value: string) {
    await onSelect(value);
    pop();
  }

  return (
    <List navigationTitle={navigationTitle} searchBarPlaceholder={searchBarPlaceholder} selectedItemId={currentValue}>
      <List.Section title={sectionTitle} subtitle={sectionSubtitle}>
        {options.map((option) => {
          const current = option.value === currentValue;
          return (
            <List.Item
              key={option.value}
              id={option.value}
              title={option.title}
              icon={{
                source: current ? Icon.CheckCircle : Icon.Circle,
                tintColor: current ? Color.Green : Color.SecondaryText,
              }}
              accessories={current ? [{ tag: { value: "Current", color: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  <Action title={`Use ${option.title}`} icon={Icon.CheckCircle} onAction={() => select(option.value)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
