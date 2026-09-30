import { ActionPanel, Action, List, LaunchProps, Color, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  assignSlot,
  clearSlot,
  deleteSavedItem,
  getSavedItems,
  getSlotAssignments,
  moveItem,
} from "./utilities/storage";
import { Entry, EntryCutPaste, QUICK_SLOT_COUNT } from "./types";
import FormCutPaste from "./components/FormCutPaste";
import { performReplacement } from "./utilities/replacements";
import EntryForm from "./components/EntryForm";
import FormDirectReplace from "./components/FormDirectReplace";
import { nanoid } from "nanoid";
import { useState } from "react";

const tagOptions: Record<Entry["type"], { value: string; color?: Color.ColorLike }> = {
  directReplace: {
    value: "Direct Replace",
    color: Color.Green,
  },
  cutPaste: {
    value: "Cut Paste",
    color: Color.Magenta,
  },
};

type OrderType = {
  id: "recent" | "alphabetical" | "manual";
  name: string;
};

const orderTypes: OrderType[] = [
  { id: "recent", name: "Recent" },
  { id: "alphabetical", name: "Alphabetical" },
  { id: "manual", name: "Manual" },
];

function EditFormFor({ entry }: { entry: Entry }) {
  return entry.type === "cutPaste" ? (
    <FormCutPaste initialValues={entry} />
  ) : (
    <FormDirectReplace initialValues={entry} />
  );
}

function OrderDropdown(props: { onOrderTypeChange: (newValue: string) => void }) {
  const { onOrderTypeChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Order Type"
      storeValue={true}
      onChange={(newValue) => {
        onOrderTypeChange(newValue);
      }}
    >
      {orderTypes.map((orderType) => (
        <List.Dropdown.Item key={orderType.id} title={orderType.name} value={orderType.id} />
      ))}
    </List.Dropdown>
  );
}

export default function ManageOptions(props: Readonly<LaunchProps<{ draftValues: EntryCutPaste }>>) {
  const { data: replacementEntries, revalidate, isLoading } = usePromise(getSavedItems);
  const { data: slotAssignments, revalidate: revalidateSlots } = usePromise(getSlotAssignments);
  const [orderType, setOrderType] = useState("manual");

  function onOrderTypeChange(newValue: string) {
    setOrderType(newValue);
  }

  function slotForEntry(entryId: string): number | undefined {
    const found = Object.entries(slotAssignments ?? {}).find(([, id]) => id === entryId);
    return found ? Number(found[0]) : undefined;
  }

  let orderedEntries = [...(replacementEntries ?? [])];

  if (orderType === "alphabetical") {
    orderedEntries = orderedEntries?.sort((a, b) => a.title.localeCompare(b.title));
  } else if (orderType === "recent") {
    orderedEntries = orderedEntries.sort((a, b) => {
      // Handle undefined values: put them last
      if (a.lastUsed === undefined && b.lastUsed === undefined) return 0;
      if (a.lastUsed === undefined) return 1;
      if (b.lastUsed === undefined) return -1;

      // Convert to Date objects
      const dateA = new Date(a.lastUsed);
      const dateB = new Date(b.lastUsed);

      // Compare using .getTime()
      return dateB.getTime() - dateA.getTime();
    });
  }

  return (
    <List
      navigationTitle="Regex replace options"
      isLoading={isLoading}
      searchBarAccessory={<OrderDropdown onOrderTypeChange={onOrderTypeChange} />}
      actions={
        <ActionPanel title="Manage item">
          <Action.Push
            title="Create New"
            target={<EntryForm initialValues={props.draftValues ?? ({} as EntryCutPaste)} isNew />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onPop={revalidate}
          />
        </ActionPanel>
      }
    >
      {!!orderedEntries &&
        orderedEntries.map((option, index) => {
          const assignedSlot = slotForEntry(option.id);
          const accessories: List.Item.Accessory[] = [];
          if (assignedSlot) {
            accessories.push({
              tag: { value: `Slot ${assignedSlot}`, color: Color.Blue },
              icon: Icon.Pin,
              tooltip: `Assigned to Quick Slot ${assignedSlot}`,
            });
          }
          accessories.push({ tag: tagOptions[option.type as Entry["type"]] });

          return (
            <List.Item
              title={option.title}
              subtitle={option.description}
              accessories={accessories}
              actions={
                <ActionPanel title="Manage item">
                  <Action
                    title="Run and Paste"
                    onAction={async () => {
                      await performReplacement(option, "paste");
                      revalidate();
                    }}
                  />
                  <Action
                    title="Run and Copy"
                    onAction={async () => {
                      await performReplacement(option, "copy");
                      revalidate();
                    }}
                  />
                  <ActionPanel.Submenu
                    title="Assign to Quick Slot"
                    icon={Icon.Pin}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  >
                    {Array.from({ length: QUICK_SLOT_COUNT }, (_, i) => i + 1).map((slot) => {
                      const occupiedBy = slotAssignments?.[String(slot)];
                      const isThisEntry = occupiedBy === option.id;
                      return (
                        <Action
                          key={slot}
                          title={
                            isThisEntry
                              ? `Quick Slot ${slot} (clear)`
                              : occupiedBy
                                ? `Quick Slot ${slot} (replace)`
                                : `Quick Slot ${slot}`
                          }
                          icon={isThisEntry ? Icon.CheckCircle : Icon.Circle}
                          onAction={async () => {
                            if (isThisEntry) {
                              await clearSlot(slot);
                            } else {
                              await assignSlot(slot, option.id);
                            }
                            revalidateSlots();
                          }}
                        />
                      );
                    })}
                  </ActionPanel.Submenu>
                  <Action.Push
                    title="Create New"
                    target={<EntryForm initialValues={props.draftValues ?? ({} as EntryCutPaste)} isNew />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onPop={revalidate}
                  />
                  <Action.Push
                    title="Edit Item"
                    target={<EditFormFor entry={option} />}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onPop={revalidate}
                  />
                  <Action.Push
                    title="Duplicate"
                    target={
                      <EntryForm
                        initialValues={{ ...option, id: nanoid(), title: option.title + " (duplicated)" }}
                        isNew
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onPop={revalidate}
                  />
                  {orderType === "manual" && (
                    <>
                      <Action
                        title="Move up"
                        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                        onAction={async () => {
                          if (index > 0) await moveItem(index, index - 1, revalidate);
                        }}
                      />
                      <Action
                        title="Move Down"
                        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                        onAction={async () => {
                          if (index < orderedEntries.length - 1) await moveItem(index, index + 1, revalidate);
                        }}
                      />
                    </>
                  )}
                  <Action
                    title="Delete"
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      await deleteSavedItem(option);
                      revalidate();
                      revalidateSlots();
                    }}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
              key={option?.id ?? index}
            />
          );
        })}
    </List>
  );
}
