import { Action, Icon, Keyboard } from "@raycast/api";

export const PinActions = ({
  appid,
  pinned,
  shown,
  setPinned,
}: {
  appid: number;
  pinned: number[];
  // Pinned games visible in the list, in order. Stored pins of games that left the library are skipped
  shown: number[];
  setPinned: (appids: number[]) => void;
}) => {
  const index = shown.indexOf(appid);
  const moveBy = (offset: number) => {
    const other = shown[index + offset];
    const next = [...pinned];
    const from = next.indexOf(appid);
    const to = next.indexOf(other);
    [next[from], next[to]] = [next[to], next[from]];
    setPinned(next);
  };

  if (!pinned.includes(appid)) {
    return (
      <Action
        title="Pin Game"
        icon={Icon.Pin}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={() => setPinned([...pinned, appid])}
      />
    );
  }

  return (
    <>
      <Action
        title="Unpin Game"
        icon={Icon.PinDisabled}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={() => setPinned(pinned.filter((id) => id !== appid))}
      />
      {index > 0 && (
        <Action
          title="Move Up in Pinned"
          icon={Icon.ArrowUp}
          shortcut={Keyboard.Shortcut.Common.MoveUp}
          onAction={() => moveBy(-1)}
        />
      )}
      {index !== -1 && index < shown.length - 1 && (
        <Action
          title="Move Down in Pinned"
          icon={Icon.ArrowDown}
          shortcut={Keyboard.Shortcut.Common.MoveDown}
          onAction={() => moveBy(1)}
        />
      )}
    </>
  );
};
