import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  InputSource,
  SLOTS,
  Slot,
  getSlots,
  listSources,
  selectSource,
} from "./lib/input-source";
import Configure from "./configure";

async function load() {
  const [sources, slots] = await Promise.all([listSources(), getSlots()]);
  return { sources, slots };
}

export default function Command() {
  const { data, isLoading, error } = usePromise(load);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not read input sources"
          description={error.message}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search input sources…">
      {data?.sources.map((source) => (
        <SourceItem
          key={source.id}
          source={source}
          assignedSlots={SLOTS.filter(
            (slot) => data.slots.get(slot) === source.id,
          )}
        />
      ))}
    </List>
  );
}

function SourceItem({
  source,
  assignedSlots,
}: {
  source: InputSource;
  assignedSlots: Slot[];
}) {
  const accessories: List.Item.Accessory[] = assignedSlots.map((slot) => ({
    tag: { value: `Layout ${slot}`, color: Color.Blue },
  }));
  accessories.push({ text: source.id });

  return (
    <List.Item
      icon={
        source.isCurrent
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
      title={source.name}
      subtitle={source.isCurrent ? "Active" : undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Switch to This Source"
            icon={Icon.Keyboard}
            onAction={async () => {
              await closeMainWindow();
              try {
                await selectSource(source.id);
              } catch (switchError) {
                await showHUD(
                  `Could not switch: ${switchError instanceof Error ? switchError.message : String(switchError)}`,
                );
              }
            }}
          />
          <Action.Push
            title="Configure Layout Slots"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            target={<Configure />}
          />
          <Action.CopyToClipboard
            title="Copy Input Source ID"
            content={source.id}
          />
        </ActionPanel>
      }
    />
  );
}
