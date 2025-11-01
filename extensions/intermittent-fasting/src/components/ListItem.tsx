import { List, Color, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { DATE_FORMAT_OPTIONS, FASTING_DURATION_MS, TIME_FORMAT_OPTIONS } from "../constants";
import { EditTimerForm } from "./EditTimerForm";
import { EnhancedItem, Item, FastingItem } from "../types";
import { stopTimer, calculateFastingProgress } from "../utils";
import { DeleteFasting } from "./actions/deleteFasting";

function getItemAccessories(item: Item) {
  const accessories = [];

  if (item.start) {
    const date = new Date(item.start);
    accessories.push({
      text: `${date.toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS)} - ${
        item.end ? new Date(item.end).toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS) : "N/A"
      }`,
    });

    if ((item as EnhancedItem).fastDuration !== undefined) {
      const actualFastDuration =
        (item.end ? new Date(item.end) : new Date()).getTime() - new Date(item.start).getTime();
      const actualFastHours = Math.floor(actualFastDuration / (1000 * 60 * 60));
      const targetFastHours = Math.floor((item.fastingDuration || FASTING_DURATION_MS) / (1000 * 60 * 60));
      const percentage = calculateFastingProgress(
        new Date(item.start),
        item.end ? new Date(item.end) : null,
        item.fastingDuration || FASTING_DURATION_MS,
      );
      accessories.push({
        tag: `${actualFastHours}h fasted • ${percentage}% of ${targetFastHours}h`,
      });
    }
  }

  return accessories;
}

interface ListItemProps {
  item: EnhancedItem;
  revalidate: () => Promise<EnhancedItem[]>;
  actions?: React.ReactNode;
}

export const ListItem: React.FC<ListItemProps> = ({ item, revalidate, actions }) => {
  const percentage = calculateFastingProgress(
    new Date(item.start),
    item.end ? new Date(item.end) : null,
    item.fastingDuration || FASTING_DURATION_MS,
  );
  const progress = Math.min(percentage / 100, 1);

  return (
    <List.Item
      icon={getProgressIcon(progress, progress < 0.8 ? Color.Red : progress < 0.98 ? Color.Orange : Color.Green)}
      key={item.id}
      subtitle={
        item.end == null
          ? `${Math.round(progress * 100)}% ${(item as FastingItem).remainingHours}h ${(item as FastingItem).remainingMinutes}m left`
          : item.notes || ""
      }
      title={new Date(item.start).toLocaleString(undefined, DATE_FORMAT_OPTIONS)}
      accessories={getItemAccessories(item)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {item.end == null && (
              <Action
                title="Stop Fast"
                onAction={async () => {
                  await stopTimer(item, revalidate);
                }}
              />
            )}
            <Action.Push
              title="Edit Fast"
              icon={Icon.Pencil}
              target={<EditTimerForm item={item} onEdit={revalidate} />}
              shortcut={Keyboard.Shortcut.Common.Edit}
            />
            <DeleteFasting item={item} revalidate={revalidate} />
          </ActionPanel.Section>
          {actions}
        </ActionPanel>
      }
    />
  );
};
