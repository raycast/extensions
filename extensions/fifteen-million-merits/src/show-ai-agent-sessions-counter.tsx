import { Color, environment, Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getEnabled, setEnabled } from "./lib/enabled";
import { checkAndEvaluateFocus } from "./lib/focus";
import { getMerits, resetMerits } from "./lib/merits";
import { decrementAgentsCounter, getAgentsCounter, incrementAgentsCounter, resetAgentsCounter } from "./lib/state";

export default function Command() {
  const {
    isLoading: isLoadingEnabled,
    data: isEnabled,
    mutate: mutateEnabled,
  } = useCachedPromise(async () => await getEnabled());

  const {
    isLoading: isLoadingCounter,
    data: agentsCounter = 0,
    mutate: mutateCounter,
  } = useCachedPromise(async () => {
    const count = getAgentsCounter();
    await checkAndEvaluateFocus();
    return count;
  });

  const {
    isLoading: isLoadingMerits,
    data: merits = 0,
    mutate: mutateMerits,
  } = useCachedPromise(async () => await getMerits());

  const handleToggleExtension = async () => {
    const nextValue = !isEnabled;
    await mutateEnabled(setEnabled(nextValue), {
      optimisticUpdate: () => nextValue,
    });
  };

  const handleIncrementCounter = async () => {
    await mutateCounter(Promise.resolve(incrementAgentsCounter()), {
      optimisticUpdate: (prev) => (prev ?? 0) + 1,
    });
  };

  const handleDecrementCounter = async () => {
    await mutateCounter(Promise.resolve(decrementAgentsCounter()), {
      optimisticUpdate: (prev) => Math.max(0, (prev ?? 0) - 1),
    });
  };

  const handleResetCounter = async () => {
    await mutateCounter(Promise.resolve(resetAgentsCounter()), {
      optimisticUpdate: () => 0,
    });
  };

  const handleResetMerits = async () => {
    await mutateMerits(resetMerits(), {
      optimisticUpdate: () => 0,
    });
  };

  const handleOpenStateFile = async () => {
    await open(environment.supportPath);
  };

  const menuBarIcon = {
    source: Icon.TwoPeople,
    tintColor: !isEnabled ? Color.SecondaryText : agentsCounter > 0 ? Color.Green : Color.Red,
  };

  return (
    <MenuBarExtra
      icon={menuBarIcon}
      title={`${agentsCounter}`}
      isLoading={isLoadingEnabled || isLoadingCounter || isLoadingMerits}
    >
      <MenuBarExtra.Section title="Settings">
        <MenuBarExtra.Item
          title={`Track AI Agent Sessions (${isEnabled ? "On" : "Off"})`}
          icon={isEnabled ? Icon.Checkmark : Icon.XMarkCircle}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={handleToggleExtension}
        />
      </MenuBarExtra.Section>

      {isEnabled ? (
        <MenuBarExtra.Section title="Sessions">
          <MenuBarExtra.Item title={`Active Sessions: ${agentsCounter}`} icon={Icon.Circle} />
          <MenuBarExtra.Item
            title="Increment Session Count"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={handleIncrementCounter}
          />
          <MenuBarExtra.Item
            title="Decrement Session Count"
            icon={Icon.Minus}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={handleDecrementCounter}
          />
          <MenuBarExtra.Item
            title="Reset Session Count"
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleResetCounter}
          />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section title="Merits">
        <MenuBarExtra.Item title={`Lifetime Merits: ${merits}`} icon={Icon.Stars} />
        <MenuBarExtra.Item
          title="Reset Merits"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={handleResetMerits}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Debug">
        <MenuBarExtra.Item
          title="Open State File"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={handleOpenStateFile}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
