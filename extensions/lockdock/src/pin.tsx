import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { useState } from "react";

import { LockdockNotInstalled } from "./components/LockdockNotInstalled";
import { LockdockNotRunning } from "./components/LockdockNotRunning";

import { DockStatus, getState, isIpcRunning, lockDock, unlockDock } from "./lib/ipc";
import { getLockDockPathSafe } from "./lib/binary";

export default function Command() {
  if (!isIpcRunning()) {
    const binPath = getLockDockPathSafe();
    if (!binPath) {
      return <LockdockNotInstalled />;
    }
    return <LockdockNotRunning binPath={binPath} />;
  }

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    isLoading,
    data: status,
    revalidate,
  } = usePromise(getState, [], {
    failureToastOptions: { title: "Failed to load Dock status" },
  });

  const runAction = async (
    loadingTitle: string,
    successTitle: string,
    failureTitle: string,
    action: () => Promise<void>,
  ) => {
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: loadingTitle,
    });

    try {
      await action();
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = successTitle;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = failureTitle;
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveAndLock = async (displayIndex: number) => {
    if (!status) {
      return;
    }

    const displayName = getDisplayName(status, displayIndex);
    if (status.target === displayIndex) {
      await runAction(
        "Unlocking Dock position…",
        "Dock position unlocked",
        "Failed to unlock Dock position",
        unlockDock,
      );
      return;
    }

    await runAction(
      `Moving Dock to ${displayName} and locking…`,
      `Dock locked to ${displayName}`,
      "Failed to move and lock Dock",
      async () => {
        await lockDock(displayIndex);
      },
    );
  };

  return (
    <List
      isLoading={isLoading || isSubmitting}
      searchBarPlaceholder="Select a display"
    >
      <List.Section title="Displays">
        {(status?.displays ?? []).map((display, index) => (
          <List.Item
            key={`${index}:${display}`}
            title={display}
            accessories={getDisplayAccessories(status, index)}
            actions={
              <ActionPanel>
                <Action
                  title={
                    status?.target === index
                      ? "Unlock Dock Position"
                      : status?.location === index
                        ? "Lock Dock Here"
                        : "Move Dock Here and Lock"
                  }
                  onAction={() => void handleMoveAndLock(index)}
                />
                <Action title="Refresh" onAction={() => void revalidate()} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function getDisplayAccessories(
  status: DockStatus | undefined,
  displayIndex: number,
) {
  if (!status) {
    return [];
  }

  const accessories: { tag: string }[] = [];
  if (status.target === displayIndex) {
    accessories.push({ tag: "Locked" });
  } else if (status.location === displayIndex) {
    accessories.push({ tag: "Dock" });
  }
  return accessories;
}

function getDisplayName(status: DockStatus, displayIndex: number): string {
  return status.displays[displayIndex];
}
