import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { clearAllSlots, clearSlot, copyToSlot, readAllSlots } from "./actions";
import {
  SLOT_NUMBERS,
  formatSize,
  previewTitle,
  slotMarkdown,
  slotSearchKeywords,
  suggestedPasteHotkey,
  suggestedSaveHotkey,
  type Slot,
} from "./slots";

export default function Command() {
  const [slots, setSlots] = useState<Partial<Record<Slot, string>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await readAllSlots();
    setSlots(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function clearOne(slot: Slot) {
    await clearSlot(slot);
    await refresh();
    await showToast({
      style: Toast.Style.Success,
      title: `Cleared slot ${slot}`,
    });
  }

  async function clearEverySlot() {
    const confirmed = await confirmAlert({
      title: "Clear all slots?",
      message: "This removes the text stored in all nine slots.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearAllSlots();
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Cleared all slots" });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Clipboard Slots"
      searchBarPlaceholder="Search the nine clipboard slots"
    >
      {SLOT_NUMBERS.map((slot) => {
        const value = slots[slot];
        return (
          <List.Item
            key={slot}
            id={`slot-${slot}`}
            title={value ? previewTitle(value) : "Empty"}
            icon={{
              source: Icon.Clipboard,
              tintColor: value ? Color.Green : Color.SecondaryText,
            }}
            keywords={slotSearchKeywords(slot, value)}
            accessories={[
              { tag: String(slot) },
              { text: value ? formatSize(value) : "Empty" },
            ]}
            detail={
              <List.Item.Detail
                markdown={slotMarkdown(value)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Slot"
                      text={String(slot)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={value ? "Filled" : "Empty"}
                    />
                    {value ? (
                      <List.Item.Detail.Metadata.Label
                        title="Length"
                        text={formatSize(value)}
                      />
                    ) : null}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Suggested save"
                      text={suggestedSaveHotkey(slot)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Suggested paste"
                      text={suggestedPasteHotkey(slot)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {value ? (
                    <>
                      <Action.Paste
                        content={value}
                        title={`Paste Slot ${slot}`}
                        icon={Icon.Clipboard}
                      />
                      <Action.CopyToClipboard
                        content={value}
                        title={`Copy Slot ${slot}`}
                      />
                    </>
                  ) : (
                    <Action
                      title="Save Selection to This Slot"
                      icon={Icon.Plus}
                      onAction={() => copyToSlot(slot)}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {value ? (
                    <Action
                      title="Replace with Selection"
                      icon={Icon.ArrowClockwise}
                      onAction={() => copyToSlot(slot)}
                    />
                  ) : null}
                  {value ? (
                    <Action
                      title="Clear Slot"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => clearOne(slot)}
                    />
                  ) : null}
                  <Action
                    title="Clear All Slots"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={() => clearEverySlot()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
