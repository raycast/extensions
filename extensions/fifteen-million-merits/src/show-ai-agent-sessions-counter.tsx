import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCount, resetCounterAndFocus, updateCounterAndFocus } from "./lib/storage";

export default function Command() {
  const {
    data: count,
    isLoading,
    mutate,
  } = useCachedPromise(async () => {
    return await getCount();
  }, []);

  const hasSessions = (count ?? 0) > 0;
  const icon = {
    source: Icon.TwoPeople,
    tintColor: hasSessions ? Color.Green : Color.Red,
  };

  const handleUpdate = async (delta: number) => {
    await mutate(updateCounterAndFocus(delta), {
      optimisticUpdate: (prev) => Math.max(0, (prev ?? 0) + delta),
    });
  };

  const handleReset = async () => {
    await mutate(resetCounterAndFocus(), {
      optimisticUpdate: () => 0,
    });
  };

  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} title={count !== undefined ? `${count}` : undefined}>
      <MenuBarExtra.Item title={`Active Sessions: ${count ?? 0}`} icon={Icon.Circle} />
      <MenuBarExtra.Item
        title="Reset Counter"
        icon={Icon.RotateAntiClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={handleReset}
      />
      <MenuBarExtra.Item
        title="Increment Session"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => handleUpdate(1)}
      />
      <MenuBarExtra.Item
        title="Decrement Session"
        icon={Icon.Minus}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => handleUpdate(-1)}
      />
    </MenuBarExtra>
  );
}
