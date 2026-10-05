import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  closeMainWindow,
} from "@raycast/api";
import { formatOccurrence, busyCalDateURL } from "./busycal-date";
import { openBusyCalItem, openBusyCalURL } from "./busycal-url";
import { BusyCalInstallation, BusyCalItem } from "./types";

/**
 * Props for the shared BusyCal item action panel.
 */
interface BusyCalItemActionsProps {
  installation: BusyCalInstallation;
  item: BusyCalItem;
}

/**
 * Standard action panel shared by BusyCal item list commands.
 *
 * - Parameter props: The resolved BusyCal install plus the selected item.
 */
export function BusyCalItemActions(props: BusyCalItemActionsProps) {
  const { installation, item } = props;
  const dateURL = busyCalDateURL(item);
  const detailLines = [
    item.title,
    `Type: ${item.type}`,
    formatOccurrence(item) ? `When: ${formatOccurrence(item)}` : undefined,
    item.location ? `Location: ${item.location}` : undefined,
    `Calendar ID: ${item.calendarID}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <ActionPanel>
      <Action
        title="Open in BusyCal"
        icon={Icon.Calendar}
        onAction={async () => {
          await openBusyCalItem(installation, item);
          await closeMainWindow();
        }}
      />
      {dateURL ? (
        <Action
          title="Open BusyCal on Date"
          icon={Icon.Clock}
          onAction={async () => {
            await openBusyCalURL(installation, dateURL);
            await closeMainWindow();
          }}
        />
      ) : null}
      <Action.CopyToClipboard title="Copy Item Details" content={detailLines} />
      <Action
        title="Copy Title"
        icon={Icon.Text}
        onAction={() => Clipboard.copy(item.title)}
      />
    </ActionPanel>
  );
}
