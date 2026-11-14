import isUrl from "is-url";
import _ from "lodash";
import { Fragment, useState } from "react";

import { Action, ActionPanel, Alert, Icon, Keyboard, List, confirmAlert } from "@raycast/api";

import type { CustomItem } from "@/customItems";
import fakerClient from "@/faker";
import usePreferences from "@/hooks/usePreferences";

export type Item = {
  section: string;
  id: string;
  value: string;
  getValue(): string;
  /** Display name; defaults to the start-cased id when omitted. */
  title?: string;
  /** Set when the item is a user-defined custom item. */
  custom?: CustomItem;
};

export type Pin = (item: Item) => void;

interface FakerListItemProps {
  item: Item;
  pin?: Pin;
  unpin?: Pin;
  onCreate?: () => void;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
}

function DefaultActions({ value, updateValue }: { value: string; updateValue: () => void }) {
  const defaultAction = usePreferences("defaultAction");

  if (defaultAction === "paste") {
    return (
      <Fragment>
        <Action.Paste title="Paste in Active App" content={value} onPaste={updateValue} />
        <Action.CopyToClipboard title="Copy to Clipboard" content={value} onCopy={updateValue} />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <Action.CopyToClipboard title="Copy to Clipboard" content={value} onCopy={updateValue} />
      <Action.Paste title="Paste in Active App" content={value} onPaste={updateValue} />
    </Fragment>
  );
}

function quicklinkUrl(item: Item, mode: "copy" | "paste") {
  const launchContext = JSON.stringify({ section: item.section, id: item.id, locale: fakerClient.locale, mode });
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/loris/random/open-quicklink?launchContext=${encodeURIComponent(launchContext)}`;
}

export default function FakerListItem({ item, pin, unpin, onCreate, onEdit, onDelete }: FakerListItemProps) {
  const [value, setValue] = useState(() => item.value || item.getValue());
  const title = item.title ?? _.startCase(item.id);

  const updateValue = async () => {
    setValue(item.getValue());
  };

  const confirmDelete = async () => {
    const confirmed = await confirmAlert({
      title: `Delete "${title}"?`,
      message: "The custom item and its pin will be removed. Quicklinks pointing to it will stop working.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) onDelete?.(item);
  };

  return (
    <List.Item
      title={title}
      icon={item.custom ? Icon.Wand : Icon.Dot}
      keywords={item.custom ? ["custom", item.custom.template] : [item.section]}
      detail={<List.Item.Detail markdown={value} />}
      actions={
        <ActionPanel>
          <DefaultActions value={value} updateValue={updateValue} />
          {isUrl(value) && <Action.OpenInBrowser url={value} shortcut={Keyboard.Shortcut.Common.Open} />}
          {pin && (
            <Action
              title="Pin Entry"
              icon={Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => pin(item)}
            />
          )}
          {unpin && (
            <Action
              title="Unpin Entry"
              icon={Icon.XMarkCircle}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => unpin(item)}
            />
          )}
          <Action
            title="Refresh Value"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={updateValue}
          />
          <Action.CreateQuicklink
            title="Create Copy Quicklink"
            quicklink={{ name: `Copy Random ${title}`, link: quicklinkUrl(item, "copy") }}
          />
          <Action.CreateQuicklink
            title="Create Paste Quicklink"
            quicklink={{ name: `Paste Random ${title}`, link: quicklinkUrl(item, "paste") }}
          />
          {(onCreate || (item.custom && (onEdit || onDelete))) && (
            <ActionPanel.Section title="Custom Items">
              {onCreate && (
                <Action
                  title="Create Custom Item"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  onAction={onCreate}
                />
              )}
              {item.custom && onEdit && (
                <Action
                  title="Edit Custom Item"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() => onEdit(item)}
                />
              )}
              {item.custom && onDelete && (
                <Action
                  title="Delete Custom Item"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={confirmDelete}
                />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
