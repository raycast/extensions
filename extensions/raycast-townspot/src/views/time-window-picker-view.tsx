import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { TimeWindow } from "../lib/event-listing";

type TimeWindowOption = {
  id: TimeWindow;
  title: string;
};

type TimeWindowPickerViewProps = {
  options: TimeWindowOption[];
  selectedTimeWindow: TimeWindow;
  onSelect: (timeWindow: TimeWindow) => void;
};

export const TimeWindowPickerView = ({
  options,
  selectedTimeWindow,
  onSelect,
}: TimeWindowPickerViewProps): JSX.Element => {
  const { pop } = useNavigation();

  return (
    <List navigationTitle="Choose Time Window">
      <List.Section title="When">
        {options.map((option) => (
          <List.Item
            key={option.id}
            title={option.title}
            icon={
              option.id === selectedTimeWindow
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Circle
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Show ${option.title}`}
                  onAction={() => {
                    onSelect(option.id);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};
