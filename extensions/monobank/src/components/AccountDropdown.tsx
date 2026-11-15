import { List } from "@raycast/api";
import { useRef } from "react";
import { AccountOrJar } from "../types";
import { getFlagImage, getStatementItemTitle, isAccount } from "../utils";

export interface DropdownSection {
  title: string;
  items: AccountOrJar[];
}

/** Pinned items first, in pinned order, then cards, FOP accounts and jars without them, as in "Show Accounts". */
export function getSections(options: {
  cards: AccountOrJar[];
  fops: AccountOrJar[];
  jars: AccountOrJar[];
  pinnedIds: string[];
}) {
  const { cards, fops, jars, pinnedIds } = options;
  const allItems = [...cards, ...fops, ...jars];
  const pinnedItems = pinnedIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is AccountOrJar => item !== undefined);
  const isUnpinned = (item: AccountOrJar) => !pinnedIds.includes(item.id);

  const sections: DropdownSection[] = [
    { title: "Pinned", items: pinnedItems },
    { title: "Cards", items: cards.filter(isUnpinned) },
    { title: "FOP Accounts", items: fops.filter(isUnpinned) },
    { title: "Jars", items: jars.filter(isUnpinned) },
  ];
  return sections.filter((section) => section.items.length > 0);
}

/**
 * `onChange` is only called when the user picks a different account.
 *
 * When the dropdown first appears, Raycast calls `onChange` with its first item, even when `value` is another
 * one. Saved as a choice, that event replaced the remembered account with the first one on every launch.
 * It is sent once per launch, not when the items change or the dropdown re-renders, so it is skipped once.
 */
export default function AccountDropdown(props: {
  value: string;
  onChange: (id: string) => void;
  sections: DropdownSection[];
}) {
  const { value, onChange, sections } = props;
  const isInitialEventPending = useRef(true);
  const firstItemId = sections[0]?.items[0]?.id;

  function handleChange(id: string) {
    // The check on the id keeps a user's pick if Raycast ever stops sending that event.
    if (isInitialEventPending.current) {
      isInitialEventPending.current = false;
      if (id === firstItemId) return;
    }
    if (id !== value) onChange(id);
  }

  return (
    <List.Dropdown tooltip="Select Account" placeholder="Search Accounts…" value={value} onChange={handleChange}>
      {sections.map((section) => (
        <List.Dropdown.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Dropdown.Item
              key={item.id}
              value={item.id}
              title={getStatementItemTitle(item)}
              icon={getFlagImage(item.currency.code)}
              keywords={isAccount(item) ? [item.currency.code, item.type, ...item.maskedPan] : [item.currency.code]}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
