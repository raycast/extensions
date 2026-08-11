import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  Selection,
  applyConversion,
  readSelectionAndConvert,
} from "./lib/convert";
import { Conversion, SLOTS, Slot, getSlots } from "./lib/input-source";

async function load() {
  const [outcome, slots] = await Promise.all([
    readSelectionAndConvert(),
    getSlots(),
  ]);
  return { outcome, slots };
}

export default function Command() {
  const { data, isLoading } = usePromise(load);

  if (data && !data.outcome.ok) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.TextCursor, tintColor: Color.SecondaryText }}
          title={data.outcome.message}
          description="Select the mistyped text in any app, then run this command again."
        />
      </List>
    );
  }

  const selection = data?.outcome.ok ? data.outcome.selection : undefined;
  const result = selection?.result;

  // Every layout is listed, including ones whose result is identical to the
  // input — Polish Pro types ASCII the same as U.S., so converting between them
  // changes nothing. Those rows are dimmed rather than hidden, so the list is
  // the same shape every time and no option is silently missing.
  const alternatives = (result?.conversions ?? []).filter(
    (conversion) => conversion.layoutId !== result?.detectedSourceId,
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        result
          ? `Typed as ${result.detectedSourceName}${selection?.wholeField ? " — whole field" : ""}`
          : "Convert Selection"
      }
      searchBarPlaceholder="Search layouts…"
    >
      {alternatives.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Keyboard, tintColor: Color.SecondaryText }}
          title="No other layouts enabled"
          description="Add more input sources in System Settings › Keyboard › Input Sources."
        />
      )}
      {alternatives.map((conversion) => (
        <ConversionItem
          key={conversion.layoutId}
          conversion={conversion}
          selection={selection}
          assignedSlots={SLOTS.filter(
            (slot) => data?.slots.get(slot) === conversion.layoutId,
          )}
        />
      ))}
    </List>
  );
}

function ConversionItem({
  conversion,
  selection,
  assignedSlots,
}: {
  conversion: Conversion;
  selection: Selection | undefined;
  assignedSlots: Slot[];
}) {
  // This layout types the text exactly as it already is. Listed either way, just
  // dimmed.
  const unchanged = conversion.text === selection?.text;

  const accessories: List.Item.Accessory[] = assignedSlots.map((slot) => ({
    tag: { value: `Layout ${slot}`, color: Color.Blue },
  }));

  return (
    <List.Item
      icon={{
        source: Icon.Keyboard,
        tintColor: unchanged ? Color.SecondaryText : Color.PrimaryText,
      }}
      title={conversion.text}
      subtitle={conversion.layoutName}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={
              selection?.wholeField
                ? "Replace Whole Field"
                : "Replace Selection"
            }
            icon={Icon.TextCursor}
            onAction={() =>
              selection &&
              applyConversion(conversion.text, conversion.layoutId, selection)
            }
          />
          <Action
            title="Copy to Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(conversion.text);
              await closeMainWindow();
              await showHUD("Copied converted text");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
