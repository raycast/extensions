import { Action, Icon, Keyboard } from "@raycast/api";

export function PinActions<T extends { id: number }>(props: {
  item: T;
  itemType: "Project" | "Group";
  pinnedItems: T[];
  setPinnedItems: (items: T[]) => void;
}) {
  const index = props.pinnedItems.findIndex((pinned) => pinned.id === props.item.id);
  const moveBy = (offset: number) => {
    const nextItems = [...props.pinnedItems];
    [nextItems[index], nextItems[index + offset]] = [nextItems[index + offset], nextItems[index]];
    props.setPinnedItems(nextItems);
  };

  if (index === -1) {
    return (
      <Action
        title={`Pin ${props.itemType}`}
        icon={Icon.Pin}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={() => props.setPinnedItems([...props.pinnedItems, props.item])}
      />
    );
  }

  return (
    <>
      <Action
        title={`Unpin ${props.itemType}`}
        icon={Icon.PinDisabled}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={() => props.setPinnedItems(props.pinnedItems.filter((pinned) => pinned.id !== props.item.id))}
      />
      {index > 0 && (
        <Action
          title="Move Up in Pinned"
          icon={Icon.ArrowUp}
          shortcut={Keyboard.Shortcut.Common.MoveUp}
          onAction={() => moveBy(-1)}
        />
      )}
      {index < props.pinnedItems.length - 1 && (
        <Action
          title="Move Down in Pinned"
          icon={Icon.ArrowDown}
          shortcut={Keyboard.Shortcut.Common.MoveDown}
          onAction={() => moveBy(1)}
        />
      )}
    </>
  );
}
