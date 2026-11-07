import { Action, Icon, Keyboard } from "@raycast/api";

export const PinActions = ({
  appid,
  pinned,
  setPinned,
}: {
  appid: number;
  pinned: number[];
  setPinned: (appids: number[]) => void;
}) => {
  const index = pinned.indexOf(appid);
  const moveBy = (offset: number) => {
    const next = [...pinned];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setPinned(next);
  };

  if (index === -1) {
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
      {index < pinned.length - 1 && (
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
