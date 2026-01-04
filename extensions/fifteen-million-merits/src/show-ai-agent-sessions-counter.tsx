import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getCount,
  getMerits,
  isEnabled,
  resetCounterAndFocus,
  resetMerits,
  setEnabled,
  updateCounterAndFocus,
} from "./lib/storage";

export default function Command() {
  const {
    data: enabled,
    isLoading: isEnabledLoading,
    mutate: mutateEnabled,
  } = useCachedPromise(async () => {
    return await isEnabled();
  }, []);

  const {
    data: sessionData,
    isLoading: isSessionsLoading,
    mutate: mutateSessions,
  } = useCachedPromise(async () => {
    const [count, merits] = await Promise.all([getCount(), getMerits()]);
    return { count, merits };
  }, []);

  const count = sessionData?.count ?? 0;
  const merits = sessionData?.merits ?? 0;
  const isExtensionEnabled = enabled !== false;

  const hasSessions = count > 0;
  const icon = {
    source: Icon.TwoPeople,
    tintColor: !isExtensionEnabled ? Color.SecondaryText : hasSessions ? Color.Green : Color.Red,
  };

  const handleUpdate = async (delta: number) => {
    await mutateSessions(
      (async () => {
        const newCount = await updateCounterAndFocus(delta);
        const newMerits = await getMerits();
        return { count: newCount, merits: newMerits };
      })(),
      {
        optimisticUpdate: (prev) => {
          if (!prev) return { count: Math.max(0, delta), merits: 0 };
          const newCount = Math.max(0, prev.count + delta);
          const meritEarned = prev.count === 0 && newCount > 0;
          return {
            count: newCount,
            merits: meritEarned ? prev.merits + 1 : prev.merits,
          };
        },
      },
    );
  };

  const handleReset = async () => {
    await mutateSessions(
      (async () => {
        await resetCounterAndFocus();
        return { count: 0, merits };
      })(),
      {
        optimisticUpdate: (prev) => ({ count: 0, merits: prev?.merits ?? 0 }),
      },
    );
  };

  const handleResetMerits = async () => {
    await mutateSessions(
      (async () => {
        await resetMerits();
        return { count, merits: 0 };
      })(),
      {
        optimisticUpdate: (prev) => ({ count: prev?.count ?? 0, merits: 0 }),
      },
    );
  };

  const handleToggleExtension = async () => {
    const newEnabled = !isExtensionEnabled;
    await mutateEnabled(setEnabled(newEnabled), {
      optimisticUpdate: () => newEnabled,
    });
  };

  return (
    <MenuBarExtra
      icon={icon}
      isLoading={isEnabledLoading || isSessionsLoading}
      title={count !== undefined ? (isExtensionEnabled ? `${count}` : ``) : undefined}
    >
      <MenuBarExtra.Item title={`Active Sessions: ${count}`} icon={Icon.Circle} />
      <MenuBarExtra.Item title={`Lifetime Merits: ${merits}`} icon={Icon.Stars} />
      <MenuBarExtra.Item
        title="Increment Session Count"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => handleUpdate(1)}
      />
      <MenuBarExtra.Item
        title="Decrement Session Count"
        icon={Icon.Minus}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => handleUpdate(-1)}
      />
      <MenuBarExtra.Item
        title={isExtensionEnabled ? "Enabled (toggle to disable)" : "Disabled (toggle to enable)"}
        icon={isExtensionEnabled ? Icon.Checkmark : Icon.XMarkCircle}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={handleToggleExtension}
      />
      <MenuBarExtra.Item
        title="Reset Merits"
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={handleResetMerits}
      />
      <MenuBarExtra.Item
        title="Reset Session Count"
        icon={Icon.RotateAntiClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={handleReset}
      />
    </MenuBarExtra>
  );
}
