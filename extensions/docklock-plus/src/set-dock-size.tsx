import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { PickerLoadError } from "./picker-load-error";
import { changeDockSize, getDockSize } from "./utils";

const percentages = Array.from({ length: 101 }, (_, percent) => percent);

export default function Command() {
  const { data: current, isLoading, error, revalidate } = usePromise(getDockSize);
  if (error) {
    return (
      <PickerLoadError title="Could Not Load Dock Size" error={error} isLoading={isLoading} onRetry={revalidate} />
    );
  }
  const sections =
    current === undefined
      ? []
      : [
          { title: "Quick Picks", sizes: [current, ...percentages.filter((p) => p !== current && p % 10 === 0)] },
          { title: "Other Sizes", sizes: percentages.filter((p) => p !== current && p % 10 !== 0) },
        ];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Dock sizes from 0% to 100%">
      {sections.map(({ title, sizes }) => (
        <List.Section key={title} title={title}>
          {sizes.map((percent) => (
            <List.Item
              key={percent}
              title={`${percent}%`}
              accessories={percent === current ? [{ icon: Icon.Checkmark, text: "Current" }] : []}
              actions={
                <ActionPanel>
                  <Action title={`Set Dock Size to ${percent}%`} onAction={() => changeDockSize(percent)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
